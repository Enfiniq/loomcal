-- Complete Production-Ready Bulk Operations Stored Procedure
-- Handles all chainable operations from the LoomCal SDK in a single ultra-efficient call
-- Supports events and users with create, read, update, delete operations
-- Full support for $or, $and, $not query operators and all specified features

CREATE OR REPLACE FUNCTION process_bulk_operations_optimized(
    p_api_key TEXT,
    p_operations JSONB,
    p_global_options JSONB DEFAULT '{}'::jsonb,
    p_endpoint TEXT DEFAULT '/api/operations/bulk',
    p_method TEXT DEFAULT 'POST',
    p_request_start_time BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_api_key_record RECORD;
    v_organization_id UUID;
    v_org_name TEXT;
    v_operation JSONB;
    v_operation_type TEXT;
    v_operation_data JSONB;
    v_operation_options JSONB;
    v_results JSONB[] := '{}';
    v_operation_result JSONB;
    v_summary JSONB;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_total_count INTEGER := 0;
    v_stop_on_error BOOLEAN;
    v_transactional BOOLEAN;
    v_index INTEGER := 0;
    v_start_time TIMESTAMP;
    v_response_time_ms INTEGER;
    v_error_message TEXT;
    v_error_code TEXT;
    v_has_critical_error BOOLEAN := false;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Parse global options
    v_stop_on_error := COALESCE((p_global_options->>'stopOnError')::boolean, false);
    v_transactional := COALESCE((p_global_options->>'transactional')::boolean, true);
    
    -- Get total operations count
    v_total_count := jsonb_array_length(p_operations);
    
    -- Early return for empty operations
    IF v_total_count = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'results', '[]'::jsonb,
            'summary', jsonb_build_object(
                'total', 0,
                'successful', 0,
                'failed', 0,
                'execution_time_ms', 0
            )
        );
    END IF;
    
    -- Validate and get API key information with enhanced security
    SELECT ak.*, o.name as org_name
    INTO v_api_key_record
    FROM api_keys ak
    JOIN organizations o ON ak.organization_id = o.id
    WHERE ak.key_hash = p_api_key
    AND ak.is_active = true 
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    AND o.is_active = true;
    
    -- Check if API key was found
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired API key',
            'error_code', 'INVALID_API_KEY',
            'results', '[]'::jsonb,
            'summary', jsonb_build_object(
                'total', v_total_count,
                'successful', 0,
                'failed', v_total_count,
                'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
            )
        );
    END IF;
    
    v_organization_id := v_api_key_record.organization_id;
    v_org_name := v_api_key_record.org_name;
    
    -- Update last used timestamp for API key
    UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = p_api_key;
    
    -- Process each operation
    FOR v_index in 0..(v_total_count - 1) LOOP
        v_operation := p_operations->v_index;
        v_operation_type := v_operation->>'type';
        v_operation_data := v_operation->'data';
        v_operation_options := COALESCE(v_operation->'options', '{}'::jsonb);
        
        -- Reset operation state
        v_operation_result := NULL;
        v_error_message := NULL;
        v_error_code := NULL;
        
        BEGIN
            -- Validate operation type
            IF v_operation_type NOT IN ('createEvents', 'getEvents', 'updateEvents', 'deleteEvents',
                                       'createUsers', 'getUsers', 'updateUsers', 'deleteUsers') THEN
                v_error_message := 'Invalid operation type: ' || v_operation_type;
                v_error_code := 'INVALID_OPERATION_TYPE';
                RAISE EXCEPTION '%', v_error_message;
            END IF;
            
            -- Check permissions for the operation
            IF NOT check_operation_permissions(v_api_key_record.permissions, v_operation_type) THEN
                v_error_message := 'Insufficient permissions for operation: ' || v_operation_type;
                v_error_code := 'INSUFFICIENT_PERMISSIONS';
                RAISE EXCEPTION '%', v_error_message;
            END IF;
            
            -- Route to appropriate handler
            CASE v_operation_type
                WHEN 'createEvents' THEN
                    v_operation_result := process_create_events_comprehensive(
                        v_organization_id, v_org_name, v_api_key_record, v_operation_data, v_operation_options
                    );
                WHEN 'getEvents' THEN
                    v_operation_result := process_get_events_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
                WHEN 'updateEvents' THEN
                    v_operation_result := process_update_events_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
                WHEN 'deleteEvents' THEN
                    v_operation_result := process_delete_events_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
                WHEN 'createUsers' THEN
                    v_operation_result := process_create_users_comprehensive(
                        v_organization_id, v_org_name, v_operation_data, v_operation_options
                    );
                WHEN 'getUsers' THEN
                    v_operation_result := process_get_users_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
                WHEN 'updateUsers' THEN
                    v_operation_result := process_update_users_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
                WHEN 'deleteUsers' THEN
                    v_operation_result := process_delete_users_comprehensive(
                        v_organization_id, v_operation_data, v_operation_options
                    );
            END CASE;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'operation', v_operation,
                'success', true,
                'result', v_operation_result
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := COALESCE(v_error_message, SQLERRM);
                v_error_code := COALESCE(v_error_code, SQLSTATE);
                
                -- Add failed result
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'operation', v_operation,
                    'success', false,
                    'error', jsonb_build_object(
                        'message', v_error_message,
                        'code', v_error_code,
                        'status', CASE 
                            WHEN v_error_code = 'INVALID_API_KEY' THEN 401
                            WHEN v_error_code = 'INSUFFICIENT_PERMISSIONS' THEN 403
                            WHEN v_error_code = 'INVALID_OPERATION_TYPE' THEN 400
                            ELSE 500
                        END
                    )
                );
                v_failed_count := v_failed_count + 1;
                
                -- Stop on error if configured
                IF v_stop_on_error THEN
                    v_has_critical_error := true;
                    v_error_message := v_error_message;
                    v_error_code := v_error_code;
                    -- If transactional mode and stop on error, rollback entire operation
                    IF v_transactional THEN
                        RAISE EXCEPTION 'Bulk operation failed: %', v_error_message;
                    END IF;
                    EXIT;
                END IF;
        END;
    END LOOP;
    
    -- Calculate final response time
    v_response_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    
    -- In transactional mode, rollback all changes if any operation failed
    IF v_transactional AND v_failed_count > 0 THEN
        RAISE EXCEPTION 'Bulk operation rolled back - % operations failed out of % total operations. Transactional mode requires all operations to succeed.', v_failed_count, v_total_count;
    END IF;
    
    -- Log API usage
    INSERT INTO api_usage_logs (
        api_key_id, endpoint, method, response_time_ms, status_code,
        operations_count, success_count, failed_count,
        error_message, created_at
    ) VALUES (
        v_api_key_record.id, p_endpoint, p_method, v_response_time_ms,
        CASE WHEN v_failed_count > 0 THEN 207 ELSE 200 END,
        v_total_count, v_success_count, v_failed_count,
        CASE WHEN v_has_critical_error THEN v_error_message ELSE NULL END,
        NOW()
    );
    
    -- Build final response
    v_summary := jsonb_build_object(
        'total', v_total_count,
        'successful', v_success_count,
        'failed', v_failed_count,
        'execution_time_ms', v_response_time_ms
    );
    
    RETURN jsonb_build_object(
        'success', CASE WHEN v_has_critical_error THEN false ELSE true END,
        'results', array_to_json(v_results)::jsonb,
        'summary', v_summary,
        'error', CASE WHEN v_has_critical_error THEN v_error_message ELSE NULL END,
        'error_code', CASE WHEN v_has_critical_error THEN v_error_code ELSE NULL END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log critical error
        INSERT INTO api_usage_logs (
            api_key_id, endpoint, method, response_time_ms, status_code,
            operations_count, success_count, failed_count, error_message, created_at
        ) VALUES (
            COALESCE(v_api_key_record.id, NULL), p_endpoint, p_method,
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
            500, v_total_count, v_success_count, v_failed_count, SQLERRM, NOW()
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Critical system error: ' || SQLERRM,
            'error_code', 'SYSTEM_ERROR',
            'results', '[]'::jsonb,
            'summary', jsonb_build_object(
                'total', v_total_count,
                'successful', v_success_count,
                'failed', v_total_count - v_success_count,
                'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
            )
        );
END;
$$;

-- Helper function to check operation permissions
CREATE OR REPLACE FUNCTION check_operation_permissions(
    p_permissions JSONB,
    p_operation_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_operation_type
        WHEN 'createEvents', 'updateEvents' THEN
            RETURN COALESCE((p_permissions->'events'->>'write')::boolean, false);
        WHEN 'getEvents' THEN
            RETURN COALESCE((p_permissions->'events'->>'read')::boolean, false);
        WHEN 'deleteEvents' THEN
            RETURN COALESCE((p_permissions->'events'->>'delete')::boolean, false);
        WHEN 'createUsers', 'updateUsers' THEN
            RETURN COALESCE((p_permissions->'users'->>'write')::boolean, false);
        WHEN 'getUsers' THEN
            RETURN COALESCE((p_permissions->'users'->>'read')::boolean, false);
        WHEN 'deleteUsers' THEN
            RETURN COALESCE((p_permissions->'users'->>'delete')::boolean, false);
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- Helper function to validate updating rules
CREATE OR REPLACE FUNCTION validate_updating_rule(
    p_organization_id UUID,
    p_target JSONB,
    p_updating_rule JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_time_between_updates INTEGER;
    v_on_no_match TEXT;
    v_on_multiple_match TEXT;
    v_uniqueness_fields JSONB;
    v_where_clause TEXT;
    v_query TEXT;
    v_existing_count INTEGER;
BEGIN
    -- Extract updating rule parameters
    v_time_between_updates := COALESCE((p_updating_rule->>'timeBetweenUpdates')::integer, 0);
    v_on_no_match := COALESCE(p_updating_rule->>'onNoMatch', 'ignore');
    v_on_multiple_match := COALESCE(p_updating_rule->>'onMultipleMatch', 'updateAll');
    v_uniqueness_fields := COALESCE(p_updating_rule->'uniquenessFields', '{}'::jsonb);
    
    -- Handle time-based logic:
    -- 0 = no checking at all (always allow operation on target)
    -- -1 = infinite time (check uniqueness only, ignore time)
    -- >0 = check time constraint first, then uniqueness
    
    IF v_time_between_updates = 0 THEN
        -- No checking - proceed with target-based operation
        v_where_clause := build_events_where_clause(p_organization_id, p_target);
    ELSE
        -- Build where clause for target matching
        v_where_clause := build_events_where_clause(p_organization_id, p_target);
        
        -- Add time constraint for numbers > 0 (not for -1 which means infinite time)
        IF v_time_between_updates > 0 THEN
            v_where_clause := v_where_clause || ' AND updated_at < NOW() - INTERVAL ''' || v_time_between_updates || ' seconds''';
        END IF;
        -- For -1 (infinite time), we don't add any time constraint
    END IF;
    
    -- Check existing records
    v_query := 'SELECT COUNT(*) FROM org_events WHERE ' || v_where_clause;
    EXECUTE v_query INTO v_existing_count;
    
    -- Apply rules
    IF v_existing_count = 0 AND v_on_no_match = 'reject' THEN
        RAISE EXCEPTION 'No records found to update and onNoMatch is set to reject';
    END IF;
    
    IF v_existing_count > 1 AND v_on_multiple_match = 'reject' THEN
        RAISE EXCEPTION 'Multiple records found and onMultipleMatch is set to reject';
    END IF;
    
    RETURN true;
END;
$$;

-- Helper function to validate deleting rules
CREATE OR REPLACE FUNCTION validate_deleting_rule(
    p_organization_id UUID,
    p_target JSONB,
    p_deleting_rule JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_time_between_deletes INTEGER;
    v_on_no_match TEXT;
    v_on_multiple_match TEXT;
    v_uniqueness_fields JSONB;
    v_where_clause TEXT;
    v_query TEXT;
    v_existing_count INTEGER;
BEGIN
    -- Extract deleting rule parameters
    v_time_between_deletes := COALESCE((p_deleting_rule->>'timeBetweenDeletes')::integer, 0);
    v_on_no_match := COALESCE(p_deleting_rule->>'onNoMatch', 'ignore');
    v_on_multiple_match := COALESCE(p_deleting_rule->>'onMultipleMatch', 'deleteAll');
    v_uniqueness_fields := COALESCE(p_deleting_rule->'uniquenessFields', '{}'::jsonb);
    
    -- Handle time-based logic:
    -- 0 = no checking at all (always allow operation on target)
    -- -1 = infinite time (check uniqueness only, ignore time)
    -- >0 = check time constraint first, then uniqueness
    
    IF v_time_between_deletes = 0 THEN
        -- No checking - proceed with target-based operation
        v_where_clause := build_events_where_clause(p_organization_id, p_target);
    ELSE
        -- Build where clause for target matching
        v_where_clause := build_events_where_clause(p_organization_id, p_target);
        
        -- Add time constraint for numbers > 0 (not for -1 which means infinite time)
        IF v_time_between_deletes > 0 THEN
            v_where_clause := v_where_clause || ' AND created_at < NOW() - INTERVAL ''' || v_time_between_deletes || ' seconds''';
        END IF;
        -- For -1 (infinite time), we don't add any time constraint
    END IF;
    
    -- Check existing records
    v_query := 'SELECT COUNT(*) FROM org_events WHERE ' || v_where_clause;
    EXECUTE v_query INTO v_existing_count;
    
    -- Apply rules
    IF v_existing_count = 0 AND v_on_no_match = 'reject' THEN
        RAISE EXCEPTION 'No records found to delete and onNoMatch is set to reject';
    END IF;
    
    IF v_existing_count > 1 AND v_on_multiple_match = 'reject' THEN
        RAISE EXCEPTION 'Multiple records found and onMultipleMatch is set to reject';
    END IF;
    
    RETURN true;
END;
$$;

-- Helper function to check isSigned for any operation
CREATE OR REPLACE FUNCTION validate_signed_with_loomcal(
    p_organization_id UUID,
    p_user_data JSONB,
    p_is_signed_config JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_check_required BOOLEAN := false;
    v_user_identifier TEXT;
    v_user_email TEXT;
    v_linked_user_id UUID;
BEGIN
    -- Parse isSigned configuration
    IF jsonb_typeof(p_is_signed_config) = 'object' THEN
        v_check_required := COALESCE((p_is_signed_config->>'check')::boolean, false);
    ELSIF jsonb_typeof(p_is_signed_config) = 'boolean' THEN
        v_check_required := COALESCE(p_is_signed_config::boolean, false);
    ELSIF jsonb_typeof(p_is_signed_config) = 'string' THEN
        v_check_required := COALESCE((p_is_signed_config#>>'{}')::boolean, false);
    ELSE
        v_check_required := false;
    END IF;
    
    -- Skip check if not required
    IF NOT v_check_required THEN
        RETURN true;
    END IF;
    
    v_user_identifier := p_user_data->>'identifier';
    v_user_email := p_user_data->>'email';
    
    -- Check if user has linked_user_id in org_customers
    SELECT linked_user_id INTO v_linked_user_id
    FROM org_customers 
    WHERE organization_id = p_organization_id 
    AND (
        (v_user_identifier IS NOT NULL AND identifier = v_user_identifier) OR
        (v_user_email IS NOT NULL AND email = v_user_email)
    );
    
    IF NOT FOUND OR v_linked_user_id IS NULL THEN
        RAISE EXCEPTION 'User is not signed with LoomCal account (no linked_user_id found)';
    END IF;
    
    RETURN true;
END;
$$;

-- Create Events Handler - Comprehensive Implementation
CREATE OR REPLACE FUNCTION process_create_events_comprehensive(
    p_organization_id UUID,
    p_org_name TEXT,
    p_api_key_record RECORD,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_events_array JSONB;
    v_event JSONB;
    v_event_data JSONB;
    v_event_options JSONB;
    v_merged_options JSONB;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_is_batch BOOLEAN;
    v_event_id UUID;
    v_customer_id UUID;
    v_error_message TEXT;
    v_index INTEGER := 0;
    v_duplicate_check BOOLEAN := false;
    v_saving_rule JSONB;
    v_default_options JSONB;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_events_array := p_operation_data;
    ELSE
        v_events_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each event
    FOR v_index in 0..(jsonb_array_length(v_events_array) - 1) LOOP
        v_event := v_events_array->v_index;
        
        -- Extract event and options from the event structure
        IF v_event ? 'event' THEN
            v_event_data := v_event->'event';
            v_event_options := COALESCE(v_event->'options', '{}'::jsonb);
        ELSE
            v_event_data := v_event;
            v_event_options := '{}'::jsonb;
        END IF;
        
        -- Merge default options with event-specific options
        v_merged_options := v_default_options || v_event_options;
        v_saving_rule := v_merged_options->'savingRule';
        
        v_error_message := NULL;
        v_duplicate_check := false;
        
        BEGIN
            -- Validate required fields
            IF v_event_data->>'title' IS NULL THEN
                RAISE EXCEPTION 'Title is required';
            END IF;
            
            IF (v_event_data->'user') IS NULL THEN
                RAISE EXCEPTION 'User information is required';
            END IF;
            
            -- Create or get customer
            DECLARE
                v_customer_result RECORD;
            BEGIN
                SELECT * INTO v_customer_result FROM get_or_create_customer_enhanced(
                    p_organization_id,
                    p_org_name,
                    v_event_data->'user',
                    CASE 
                        WHEN v_merged_options ? 'isSigned' THEN v_merged_options->'isSigned'
                        ELSE 'false'::jsonb
                    END
                );
                
                v_customer_id := v_customer_result.customer_id;
                
                -- Check if we should reject event creation but customer was created
                IF v_customer_result.should_reject_event THEN
                    v_results := v_results || jsonb_build_object(
                        'index', v_index,
                        'success', false,
                        'error', v_customer_result.reject_message,
                        'customerCreated', true
                    );
                    v_failed_count := v_failed_count + 1;
                    CONTINUE; -- Skip to next event
                END IF;
            END;
            
            -- Check for duplicates if saving rule is specified
            IF v_saving_rule IS NOT NULL THEN
                v_duplicate_check := check_event_duplicate_enhanced(
                    p_organization_id,
                    v_customer_id,
                    v_event_data,
                    v_saving_rule
                );
                
                IF v_duplicate_check THEN
                    CASE v_saving_rule->>'onDuplicate'
                        WHEN 'ignore' THEN
                            v_results := v_results || jsonb_build_object(
                                'index', v_index,
                                'success', true,
                                'skipped', true,
                                'reason', 'Duplicate event ignored'
                            );
                            v_success_count := v_success_count + 1;
                            CONTINUE;
                        WHEN 'reject' THEN
                            RAISE EXCEPTION 'Duplicate event found';
                        WHEN 'update' THEN
                            -- Handle update logic for duplicate
                            DECLARE
                                v_update_query TEXT;
                                v_update_conditions TEXT;
                                v_updated_count INTEGER;
                                v_updated_event_id UUID;
                            BEGIN
                                -- Build WHERE clause for finding the duplicate event
                                v_update_conditions := build_duplicate_where_clause(
                                    p_organization_id,
                                    v_customer_id,
                                    v_event_data,
                                    v_saving_rule
                                );
                                
                                -- Update the existing duplicate event
                                v_update_query := FORMAT('
                                    UPDATE org_events 
                                    SET 
                                        title = %s,
                                        description = %s,
                                        start_time = %s,
                                        end_time = %s,
                                        repeat = %s,
                                        type = %s,
                                        color = %s,
                                        resource = %s,
                                        custom_data = %s,
                                        updated_at = NOW()
                                    WHERE %s
                                    RETURNING id
                                ',
                                    quote_literal(v_event_data->>'title'),
                                    CASE WHEN v_event_data ? 'description' THEN quote_literal(v_event_data->>'description') ELSE 'NULL' END,
                                    CASE WHEN v_event_data ? 'startTime' THEN quote_literal((v_event_data->>'startTime')::timestamp with time zone) ELSE 'NOW()' END,
                                    CASE WHEN v_event_data ? 'endTime' THEN quote_literal((v_event_data->>'endTime')::timestamp with time zone) ELSE 'NULL' END,
                                    CASE WHEN v_event_data ? 'repeat' THEN quote_literal(v_event_data->>'repeat') ELSE '''none''' END,
                                    CASE WHEN v_event_data ? 'type' THEN quote_literal(v_event_data->>'type') ELSE 'NULL' END,
                                    CASE WHEN v_event_data ? 'color' THEN quote_literal(v_event_data->>'color') ELSE 'NULL' END,
                                    CASE WHEN v_event_data ? 'resource' THEN quote_literal(v_event_data->>'resource') ELSE 'NULL' END,
                                    CASE WHEN v_event_data ? 'customData' THEN quote_literal(v_event_data->'customData') ELSE 'NULL' END,
                                    v_update_conditions
                                );
                                
                                -- Execute the update
                                EXECUTE v_update_query INTO v_updated_event_id;
                                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                                
                                IF v_updated_count > 0 THEN
                                    v_results := v_results || jsonb_build_object(
                                        'index', v_index,
                                        'success', true,
                                        'updated', true,
                                        'eventId', v_updated_event_id,
                                        'reason', 'Duplicate event updated'
                                    );
                                    v_success_count := v_success_count + 1;
                                ELSE
                                    v_results := v_results || jsonb_build_object(
                                        'index', v_index,
                                        'success', false,
                                        'error', 'Failed to update duplicate event'
                                    );
                                    v_failed_count := v_failed_count + 1;
                                END IF;
                                
                                CONTINUE;
                            END;
                    END CASE;
                END IF;
            END IF;
            
            -- Create the event
            INSERT INTO org_events (
                organization_id,
                org_customer_id,
                title,
                description,
                start_time,
                end_time,
                repeat,
                type,
                color,
                resource,
                custom_data
            ) VALUES (
                p_organization_id,
                v_customer_id,
                v_event_data->>'title',
                v_event_data->>'description',
                COALESCE((v_event_data->>'startTime')::timestamp with time zone, NOW()),
                (v_event_data->>'endTime')::timestamp with time zone,
                v_event_data->>'repeat',
                v_event_data->>'type',
                v_event_data->>'color',
                v_event_data->>'resource',
                COALESCE(v_event_data->'customData', '{}'::jsonb)
            ) RETURNING id INTO v_event_id;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'eventId', v_event_id,
                'customerId', v_customer_id
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_events_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Enhanced customer creation with LoomCal account linking and advanced configuration
CREATE OR REPLACE FUNCTION get_or_create_customer_enhanced(
    p_organization_id UUID,
    p_org_name TEXT,
    p_user_data JSONB,
    p_is_signed_with_loomcal JSONB DEFAULT 'false'::jsonb,
    OUT customer_id UUID,
    OUT should_reject_event BOOLEAN,
    OUT reject_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_identifier TEXT;
    v_composite_id TEXT;
    v_linked_user_id UUID;
    v_email TEXT;
    v_check_required BOOLEAN := false;
    v_create_user_if_not_signed BOOLEAN := false;
    v_should_be_strict BOOLEAN := false;
    v_existing_customer_linked_user_id UUID;
    v_user_found_in_org BOOLEAN := false;
    v_user_signed_with_loomcal BOOLEAN := false;
BEGIN
    -- Initialize output parameters
    should_reject_event := false;
    reject_message := '';
    
    v_identifier := p_user_data->>'identifier';
    v_email := p_user_data->>'email';
    v_composite_id := p_org_name || '_' || v_identifier;
    
    -- Validate linkedUserId if provided
    IF p_user_data ? 'linkedUserId' AND p_user_data->>'linkedUserId' IS NOT NULL AND p_user_data->>'linkedUserId' != '' THEN
        -- Check if the linkedUserId exists in the users table
        SELECT id INTO v_linked_user_id 
        FROM users 
        WHERE id = (p_user_data->>'linkedUserId')::UUID;
        
        IF v_linked_user_id IS NULL THEN
            RAISE EXCEPTION 'Invalid linkedUserId: %. User does not exist in the users table.', p_user_data->>'linkedUserId';
        END IF;
    ELSE
        v_linked_user_id := NULL;
    END IF;
    
    -- Parse isSigned configuration
    IF jsonb_typeof(p_is_signed_with_loomcal) = 'object' THEN
        -- Enhanced configuration object
        v_check_required := COALESCE((p_is_signed_with_loomcal->>'check')::boolean, false);
        v_create_user_if_not_signed := COALESCE((p_is_signed_with_loomcal->>'createUser')::boolean, false);
        v_should_be_strict := COALESCE((p_is_signed_with_loomcal->>'strict')::boolean, false);
    ELSIF jsonb_typeof(p_is_signed_with_loomcal) = 'boolean' THEN
        -- Simple boolean (backward compatibility)
        v_check_required := COALESCE(p_is_signed_with_loomcal::boolean, false);
        v_create_user_if_not_signed := false;
        v_should_be_strict := false;
    ELSE
        v_check_required := false;
        v_create_user_if_not_signed := false;
        v_should_be_strict := false;
    END IF;
    
    -- Step 1: Check if customer already exists in org_customers
    SELECT id, linked_user_id INTO v_customer_id, v_existing_customer_linked_user_id
    FROM org_customers 
    WHERE organization_id = p_organization_id AND identifier = v_identifier;
    
    IF FOUND THEN
        v_user_found_in_org := true;
        -- Check if user is signed with LoomCal (has valid linked_user_id)
        v_user_signed_with_loomcal := (v_existing_customer_linked_user_id IS NOT NULL);
    ELSE
        v_user_found_in_org := false;
        v_user_signed_with_loomcal := false;
    END IF;
    
    -- Step 2: Apply isSigned logic
    
    -- If check is false, equivalent to isSigned: false - no need to check anything
    IF NOT v_check_required THEN
        -- No checking required, just create/update user as needed
        IF v_create_user_if_not_signed THEN
            -- Always create/update user when createUser=true
            IF v_user_found_in_org THEN
                -- Update existing customer
                UPDATE org_customers 
                SET 
                    name = COALESCE(p_user_data->>'name', name),
                    email = COALESCE(v_email, email),
                    custom_data = COALESCE(p_user_data->'customData', custom_data),
                    linked_user_id = CASE 
                        WHEN p_user_data ? 'linkedUserId' THEN v_linked_user_id 
                        ELSE linked_user_id 
                    END,
                    updated_at = NOW()
                WHERE id = v_customer_id;
            ELSE
                -- Create new customer
                INSERT INTO org_customers (
                    organization_id, identifier, composite_id, name, email, custom_data,
                    linked_user_id, created_at, updated_at
                ) VALUES (
                    p_organization_id, v_identifier, v_composite_id, p_user_data->>'name',
                    v_email, p_user_data->'customData', 
                    v_linked_user_id, 
                    NOW(), NOW()
                ) RETURNING id INTO v_customer_id;
            END IF;
        ELSIF v_user_found_in_org THEN
            -- User exists but createUser=false, just update
            UPDATE org_customers 
            SET 
                name = COALESCE(p_user_data->>'name', name),
                email = COALESCE(v_email, email),
                custom_data = COALESCE(p_user_data->'customData', custom_data),
                linked_user_id = CASE 
                    WHEN p_user_data ? 'linkedUserId' THEN v_linked_user_id 
                    ELSE linked_user_id 
                END,
                updated_at = NOW()
            WHERE id = v_customer_id;
        ELSE
            -- User doesn't exist and createUser=false, create anyway for event
            INSERT INTO org_customers (
                organization_id, identifier, composite_id, name, email, custom_data,
                linked_user_id, created_at, updated_at
            ) VALUES (
                p_organization_id, v_identifier, v_composite_id, p_user_data->>'name',
                v_email, p_user_data->'customData', 
                v_linked_user_id, 
                NOW(), NOW()
            ) RETURNING id INTO v_customer_id;
        END IF;
        
        customer_id := v_customer_id;
        RETURN;
    END IF;
    
    -- Step 3: check=true logic
    
    -- First check: Does user exist in org_customers?
    IF NOT v_user_found_in_org THEN
        -- User doesn't exist in org_customers - interpret as not signed
        IF v_create_user_if_not_signed THEN
            -- Create user but reject event
            INSERT INTO org_customers (
                organization_id, identifier, composite_id, name, email, custom_data,
                linked_user_id, created_at, updated_at
            ) VALUES (
                p_organization_id, v_identifier, v_composite_id, p_user_data->>'name',
                v_email, p_user_data->'customData', 
                v_linked_user_id, 
                NOW(), NOW()
            ) RETURNING id INTO v_customer_id;
            
            customer_id := v_customer_id;
            should_reject_event := true;
            reject_message := 'User created in organization but event creation rejected - user ' || v_identifier || ' is not signed with LoomCal';
            RETURN;
        ELSE
            -- createUser=false and user not in org - reject everything
            RAISE EXCEPTION 'Cannot create customer % - user is not signed with LoomCal (not in database) and createUser=false', v_identifier;
        END IF;
    END IF;
    
    -- Step 4: User exists in org_customers, now check strict logic
    
    IF v_should_be_strict THEN
        -- strict=true: Check if linked_user_id has legit value (not null)
        IF NOT v_user_signed_with_loomcal THEN
            -- User exists in org but not properly linked (linked_user_id is null)
            IF v_create_user_if_not_signed THEN
                -- Update user but reject event
                UPDATE org_customers 
                SET 
                    name = COALESCE(p_user_data->>'name', name),
                    email = COALESCE(v_email, email),
                    custom_data = COALESCE(p_user_data->'customData', custom_data),
                    updated_at = NOW()
                WHERE id = v_customer_id;
                
                customer_id := v_customer_id;
                should_reject_event := true;
                reject_message := 'User updated in organization but event creation rejected - user ' || v_identifier || ' is not properly signed with LoomCal (strict mode)';
                RETURN;
            ELSE
                -- createUser=false and strict validation failed
                RAISE EXCEPTION 'User % exists but is not properly signed with LoomCal (strict mode) and createUser=false', v_identifier;
            END IF;
        END IF;
    END IF;
    
    -- Step 5: All checks passed - user is signed, create/update and allow event
    
    -- Always create/update user when they pass the signing checks
    IF v_user_found_in_org THEN
        UPDATE org_customers 
        SET 
            name = COALESCE(p_user_data->>'name', name),
            email = COALESCE(v_email, email),
            custom_data = COALESCE(p_user_data->'customData', custom_data),
            linked_user_id = CASE 
                WHEN p_user_data ? 'linkedUserId' THEN v_linked_user_id 
                ELSE linked_user_id 
            END,
            updated_at = NOW()
        WHERE id = v_customer_id;
    ELSE
        -- This shouldn't happen given our logic above, but safety fallback
        INSERT INTO org_customers (
            organization_id, identifier, composite_id, name, email, custom_data,
            linked_user_id, created_at, updated_at
        ) VALUES (
            p_organization_id, v_identifier, v_composite_id, p_user_data->>'name',
            v_email, p_user_data->'customData', 
            v_linked_user_id, 
            NOW(), NOW()
        ) RETURNING id INTO v_customer_id;
    END IF;
    
    customer_id := v_customer_id;
    RETURN;
END;
$$;

-- Enhanced duplicate checking with proper logical operator support
CREATE OR REPLACE FUNCTION check_event_duplicate_enhanced(
    p_organization_id UUID,
    p_customer_id UUID,
    p_event_data JSONB,
    p_saving_rule JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uniqueness_fields JSONB;
    v_time_between_duplicates INTEGER;
    v_where_conditions TEXT[] := '{}';
    v_where_clause TEXT;
    v_query TEXT;
    v_existing_count INTEGER;
    v_field TEXT;
    v_uniqueness_condition TEXT;
BEGIN
    -- Extract saving rule parameters
    v_uniqueness_fields := COALESCE(p_saving_rule->'uniquenessFields', '[]'::jsonb);
    v_time_between_duplicates := COALESCE((p_saving_rule->>'timeBetweenDuplicates')::integer, 0);
    
    -- Handle time-based logic:
    -- 0 = no checking at all (always allow)
    -- -1 = infinite time (check uniqueness only, ignore time)
    -- >0 = check time constraint first, then uniqueness
    
    IF v_time_between_duplicates = 0 THEN
        -- No checking at all - always allow
        RETURN false;
    END IF;
    
    -- Always include organization filter
    v_where_conditions := v_where_conditions || ('organization_id = ' || quote_literal(p_organization_id));
    
    -- Add time constraint for numbers > 0 (not for -1 which means infinite time)
    IF v_time_between_duplicates > 0 THEN
        v_where_conditions := v_where_conditions || ('created_at > NOW() - INTERVAL ''' || v_time_between_duplicates || ' seconds''');
    END IF;
    -- For -1 (infinite time), we don't add any time constraint - check all time
    
    -- Build uniqueness conditions based on uniquenessFields structure
    IF jsonb_typeof(v_uniqueness_fields) = 'array' THEN
        -- Simple array of field names (backward compatibility)
        -- All fields in the array must match (AND logic)
        FOR i IN 0..(jsonb_array_length(v_uniqueness_fields) - 1) LOOP
            v_field := v_uniqueness_fields->>i;
            v_uniqueness_condition := build_single_field_condition(v_field, p_event_data, p_customer_id);
            IF v_uniqueness_condition IS NOT NULL AND v_uniqueness_condition != '' THEN
                v_where_conditions := v_where_conditions || v_uniqueness_condition;
            END IF;
        END LOOP;
    ELSE
        -- Complex uniquenessFields with logical operators ($and, $or, $not)
        v_uniqueness_condition := build_complex_uniqueness_condition(v_uniqueness_fields, p_event_data, p_customer_id);
        IF v_uniqueness_condition IS NOT NULL AND v_uniqueness_condition != '' THEN
            v_where_conditions := v_where_conditions || v_uniqueness_condition;
        END IF;
    END IF;
    
    -- Build and execute query
    v_where_clause := array_to_string(v_where_conditions, ' AND ');
    
    -- Handle case where no uniqueness conditions were built
    IF array_length(v_where_conditions, 1) <= 2 THEN -- Only org and time conditions
        -- If no uniqueness fields specified, default to checking user + title + type
        v_where_conditions := v_where_conditions || ('org_customer_id = ' || quote_literal(p_customer_id));
        IF p_event_data ? 'title' THEN
            v_where_conditions := v_where_conditions || ('title = ' || quote_literal(p_event_data->>'title'));
        END IF;
        IF p_event_data ? 'type' THEN
            v_where_conditions := v_where_conditions || ('type = ' || quote_literal(p_event_data->>'type'));
        END IF;
        v_where_clause := array_to_string(v_where_conditions, ' AND ');
    END IF;
    
    v_query := 'SELECT COUNT(*) FROM org_events WHERE ' || v_where_clause;
    
    EXECUTE v_query INTO v_existing_count;
    
    RETURN v_existing_count > 0;
END;
$$;

-- Helper function to build a single field condition for uniqueness checking
CREATE OR REPLACE FUNCTION build_single_field_condition(
    p_field TEXT,
    p_event_data JSONB,
    p_customer_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_condition TEXT;
    v_event_value TEXT;
    v_field_parts TEXT[];
    v_json_path TEXT;
    v_valid_base_fields TEXT[] := ARRAY['title', 'description', 'type', 'startTime', 'endTime', 'repeat', 'color', 'resource', 'customData', 'user', 'user.email', 'user.name', 'user.identifier', 'user.linkedUserId'];
BEGIN
    -- Handle nested field access like "customData.mixed" or "user.customData.field"
    IF p_field LIKE 'customData.%' THEN
        v_field_parts := string_to_array(p_field, '.');
        -- Remove 'customData' and build JSON path for nested access
        v_json_path := array_to_string(v_field_parts[2:array_length(v_field_parts, 1)], '.');
        v_event_value := p_event_data->'customData'->>v_json_path;
        IF v_event_value IS NOT NULL THEN
            v_condition := 'custom_data->>''' || v_json_path || ''' = ' || quote_literal(v_event_value);
        END IF;
    ELSIF p_field LIKE 'user.customData.%' THEN
        v_field_parts := string_to_array(p_field, '.');
        -- Remove 'user.customData' and build JSON path for nested access
        v_json_path := array_to_string(v_field_parts[3:array_length(v_field_parts, 1)], '.');
        v_event_value := p_event_data->'user'->'customData'->>v_json_path;
        IF v_event_value IS NOT NULL THEN
            -- Compare against org_customer custom_data field (user data is stored there)
            v_condition := 'org_customer_id IN (SELECT id FROM org_customers WHERE custom_data->>''' || v_json_path || ''' = ' || quote_literal(v_event_value) || ')';
        END IF;
    ELSE
        -- Validate that the field is in our allowed list for uniqueness
        IF NOT (p_field = ANY(v_valid_base_fields)) THEN
            RAISE EXCEPTION 'Invalid uniqueness field name: %. Only base fields (title, description, type, startTime, endTime, repeat, color, resource, customData, user, user.email, user.name, user.identifier, user.linkedUserId) and nested fields (customData.*, user.customData.*) are allowed for uniqueness checking.', p_field;
        END IF;
        
        -- Handle field mapping and condition building
        CASE p_field
            WHEN 'title' THEN
                v_event_value := p_event_data->>'title';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'title = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'type' THEN
                v_event_value := p_event_data->>'type';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'type = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'startTime' THEN
                v_event_value := p_event_data->>'startTime';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'start_time = ' || quote_literal(v_event_value::timestamp with time zone);
                END IF;
            WHEN 'endTime' THEN
                v_event_value := p_event_data->>'endTime';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'end_time = ' || quote_literal(v_event_value::timestamp with time zone);
                END IF;
            WHEN 'description' THEN
                v_event_value := p_event_data->>'description';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'description = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'repeat' THEN
                v_event_value := p_event_data->>'repeat';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'repeat = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'color' THEN
                v_event_value := p_event_data->>'color';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'color = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'resource' THEN
                v_event_value := p_event_data->>'resource';
                IF v_event_value IS NOT NULL THEN
                    v_condition := 'resource = ' || quote_literal(v_event_value);
                END IF;
            WHEN 'customData' THEN
                IF p_event_data ? 'customData' THEN
                    v_condition := 'custom_data = ' || quote_literal(p_event_data->'customData');
                END IF;
            WHEN 'user' THEN
                -- Match against org_customer_id (user reference)
                v_condition := 'org_customer_id = ' || quote_literal(p_customer_id);
            WHEN 'user.email' THEN
                v_event_value := p_event_data->'user'->>'email';
                IF v_event_value IS NOT NULL THEN
                    -- Match against org_customer email
                    v_condition := 'org_customer_id IN (SELECT id FROM org_customers WHERE email = ' || quote_literal(v_event_value) || ')';
                END IF;
            WHEN 'user.name' THEN
                v_event_value := p_event_data->'user'->>'name';
                IF v_event_value IS NOT NULL THEN
                    -- Match against org_customer name
                    v_condition := 'org_customer_id IN (SELECT id FROM org_customers WHERE name = ' || quote_literal(v_event_value) || ')';
                END IF;
            WHEN 'user.identifier' THEN
                v_event_value := p_event_data->'user'->>'identifier';
                IF v_event_value IS NOT NULL THEN
                    -- Match against org_customer identifier
                    v_condition := 'org_customer_id IN (SELECT id FROM org_customers WHERE identifier = ' || quote_literal(v_event_value) || ')';
                END IF;
            WHEN 'user.linkedUserId' THEN
                v_event_value := p_event_data->'user'->>'linkedUserId';
                IF v_event_value IS NOT NULL THEN
                    -- Match against org_customer linked_user_id
                    v_condition := 'org_customer_id IN (SELECT id FROM org_customers WHERE linked_user_id = ' || quote_literal(v_event_value::UUID) || ')';
                END IF;
            ELSE
                -- This should not happen due to validation above, but just in case
                v_condition := NULL;
        END CASE;
    END IF;
    
    RETURN v_condition;
END;
$$;

-- Helper function to build complex uniqueness conditions with proper logical operator support
CREATE OR REPLACE FUNCTION build_complex_uniqueness_condition(
    p_uniqueness_fields JSONB,
    p_event_data JSONB,
    p_customer_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conditions TEXT[] := '{}';
    v_condition TEXT;
    v_key TEXT;
    v_value JSONB;
    v_or_conditions TEXT[] := '{}';
    v_and_conditions TEXT[] := '{}';
    v_not_condition TEXT;
    v_sub_condition TEXT;
    i INTEGER;
BEGIN
    -- Handle $or operator
    IF p_uniqueness_fields ? '$or' THEN
        FOR i IN 0..(jsonb_array_length(p_uniqueness_fields->'$or') - 1) LOOP
            v_sub_condition := build_complex_uniqueness_condition(p_uniqueness_fields->'$or'->i, p_event_data, p_customer_id);
            IF v_sub_condition IS NOT NULL AND v_sub_condition != '' THEN
                v_or_conditions := v_or_conditions || v_sub_condition;
            END IF;
        END LOOP;
        IF array_length(v_or_conditions, 1) > 0 THEN
            v_conditions := v_conditions || ('(' || array_to_string(v_or_conditions, ' OR ') || ')');
        END IF;
    END IF;
    
    -- Handle $and operator
    IF p_uniqueness_fields ? '$and' THEN
        FOR i IN 0..(jsonb_array_length(p_uniqueness_fields->'$and') - 1) LOOP
            v_sub_condition := build_complex_uniqueness_condition(p_uniqueness_fields->'$and'->i, p_event_data, p_customer_id);
            IF v_sub_condition IS NOT NULL AND v_sub_condition != '' THEN
                v_and_conditions := v_and_conditions || v_sub_condition;
            END IF;
        END LOOP;
        IF array_length(v_and_conditions, 1) > 0 THEN
            v_conditions := v_conditions || ('(' || array_to_string(v_and_conditions, ' AND ') || ')');
        END IF;
    END IF;
    
    -- Handle $not operator
    IF p_uniqueness_fields ? '$not' THEN
        v_not_condition := build_complex_uniqueness_condition(p_uniqueness_fields->'$not', p_event_data, p_customer_id);
        IF v_not_condition IS NOT NULL AND v_not_condition != '' THEN
            v_conditions := v_conditions || ('NOT (' || v_not_condition || ')');
        END IF;
    END IF;
    
    -- Handle regular field specifications (boolean flags indicating if field should be checked)
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_uniqueness_fields) LOOP
        IF v_key NOT IN ('$or', '$and', '$not') THEN
            -- Check if the field should be included (value should be true)
            IF v_value::boolean = true THEN
                v_condition := build_single_field_condition(v_key, p_event_data, p_customer_id);
                IF v_condition IS NOT NULL AND v_condition != '' THEN
                    v_conditions := v_conditions || v_condition;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- Return combined conditions
    IF array_length(v_conditions, 1) > 0 THEN
        RETURN array_to_string(v_conditions, ' AND ');
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- Helper function to build WHERE clause for finding duplicate events to update
CREATE OR REPLACE FUNCTION build_duplicate_where_clause(
    p_organization_id UUID,
    p_customer_id UUID,
    p_event_data JSONB,
    p_saving_rule JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uniqueness_fields JSONB;
    v_include_user_in_uniqueness BOOLEAN;
    v_time_between_duplicates INTEGER;
    v_where_conditions TEXT[] := '{}';
    v_where_clause TEXT;
    v_field TEXT;
    v_uniqueness_condition TEXT;
BEGIN
    -- Extract saving rule parameters
    v_uniqueness_fields := COALESCE(p_saving_rule->'uniquenessFields', '[]'::jsonb);
    -- Remove includeUserInUniqueness - now handled in uniquenessFields
    v_time_between_duplicates := COALESCE((p_saving_rule->>'timeBetweenDuplicates')::integer, 0);
    
    -- Build uniqueness conditions based on uniquenessFields structure
    IF jsonb_typeof(v_uniqueness_fields) = 'array' THEN
        -- Simple array of field names (backward compatibility)
        FOR i IN 0..(jsonb_array_length(v_uniqueness_fields) - 1) LOOP
            v_field := v_uniqueness_fields->>i;
            CASE v_field
                WHEN 'title' THEN
                    v_where_conditions := v_where_conditions || ('title = ' || quote_literal(p_event_data->>'title'));
                WHEN 'type' THEN
                    IF (p_event_data->>'type') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('type = ' || quote_literal(p_event_data->>'type'));
                    END IF;
                WHEN 'startTime' THEN
                    IF (p_event_data->>'startTime') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('start_time = ' || quote_literal((p_event_data->>'startTime')::timestamp with time zone));
                    END IF;
                WHEN 'endTime' THEN
                    IF (p_event_data->>'endTime') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('end_time = ' || quote_literal((p_event_data->>'endTime')::timestamp with time zone));
                    END IF;
                WHEN 'description' THEN
                    IF (p_event_data->>'description') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('description = ' || quote_literal(p_event_data->>'description'));
                    END IF;
                WHEN 'repeat' THEN
                    IF (p_event_data->>'repeat') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('repeat = ' || quote_literal(p_event_data->>'repeat'));
                    END IF;
                WHEN 'color' THEN
                    IF (p_event_data->>'color') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('color = ' || quote_literal(p_event_data->>'color'));
                    END IF;
                WHEN 'resource' THEN
                    IF (p_event_data->>'resource') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('resource = ' || quote_literal(p_event_data->>'resource'));
                    END IF;
                WHEN 'customData' THEN
                    IF (p_event_data->>'customData') IS NOT NULL THEN
                        v_where_conditions := v_where_conditions || ('custom_data = ' || quote_literal(p_event_data->'customData'));
                    END IF;
                WHEN 'userId' THEN
                    IF v_include_user_in_uniqueness THEN
                        v_where_conditions := v_where_conditions || ('org_customer_id = ' || quote_literal(p_customer_id));
                    END IF;
            END CASE;
        END LOOP;
    ELSE
        -- Complex uniquenessFields with logical operators ($and, $or, $not)
        v_uniqueness_condition := build_complex_uniqueness_condition(v_uniqueness_fields, p_event_data, p_customer_id);
        IF v_uniqueness_condition IS NOT NULL AND v_uniqueness_condition != '' THEN
            v_where_conditions := v_where_conditions || v_uniqueness_condition;
        END IF;
    END IF;
    
    -- Include user in uniqueness if specified and not already handled
    IF v_include_user_in_uniqueness AND NOT (v_uniqueness_fields ? 'userId') THEN
        v_where_conditions := v_where_conditions || ('org_customer_id = ' || quote_literal(p_customer_id));
    END IF;
    
    -- Always include organization filter
    v_where_conditions := v_where_conditions || ('organization_id = ' || quote_literal(p_organization_id));
    
    -- Add time constraint for timeBetweenDuplicates > 0
    IF v_time_between_duplicates > 0 THEN
        v_where_conditions := v_where_conditions || ('created_at > NOW() - INTERVAL ''' || v_time_between_duplicates || ' seconds''');
    END IF;
    -- For timeBetweenDuplicates = -1, we check all time (no time constraint)
    
    -- Build and return WHERE clause
    v_where_clause := array_to_string(v_where_conditions, ' AND ');
    
    -- Handle case where no conditions were built
    IF v_where_clause = '' OR v_where_clause IS NULL THEN
        v_where_clause := 'organization_id = ' || quote_literal(p_organization_id);
    END IF;
    
    RETURN v_where_clause;
END;
$$;

-- Get Events Handler - Comprehensive Implementation with $or/$and support
CREATE OR REPLACE FUNCTION process_get_events_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queries_array JSONB;
    v_query JSONB;
    v_target JSONB;
    v_query_options JSONB;
    v_default_options JSONB;
    v_merged_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_order_clause TEXT;
    v_limit_clause TEXT;
    v_query_sql TEXT;
    v_events JSONB;
    v_error_message TEXT;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_queries_array := p_operation_data;
    ELSE
        v_queries_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each query
    FOR v_index in 0..(jsonb_array_length(v_queries_array) - 1) LOOP
        v_query := v_queries_array->v_index;
        v_target := v_query->'target';
        v_query_options := COALESCE(v_query->'options', '{}'::jsonb);
        
        -- Merge default options with query-specific options
        v_merged_options := v_default_options || v_query_options;
        
        v_error_message := NULL;
        
        BEGIN
            -- Build WHERE clause with support for $or, $and, $not operators
            v_where_clause := build_events_where_clause(p_organization_id, v_target);
            
            -- Build ORDER BY clause
            v_order_clause := build_order_clause(
                COALESCE(v_merged_options->>'sortBy', 'created_at'),
                COALESCE(v_merged_options->>'sortOrder', 'desc')
            );
            
            -- Build LIMIT clause
            v_limit_clause := build_limit_clause(
                COALESCE((v_merged_options->>'limit')::integer, 50),
                COALESCE((v_merged_options->>'offset')::integer, 0)
            );
            
            -- Build final query (fix GROUP BY issue by using subquery)
            v_query_sql := FORMAT('
                SELECT COALESCE(jsonb_agg(event_data), ''[]''::jsonb)
                FROM (
                    SELECT jsonb_build_object(
                        ''id'', e.id,
                        ''title'', e.title,
                        ''description'', e.description,
                        ''startTime'', e.start_time,
                        ''endTime'', e.end_time,
                        ''repeat'', e.repeat,
                        ''type'', e.type,
                        ''color'', e.color,
                        ''resource'', e.resource,
                        ''customData'', e.custom_data,
                        ''user'', jsonb_build_object(
                            ''id'', c.identifier,
                            ''name'', c.name,
                            ''email'', c.email,
                            ''customData'', c.custom_data,
                            ''linkedUserId'', c.linked_user_id
                        ),
                        ''createdAt'', e.created_at,
                        ''updatedAt'', e.updated_at
                    ) as event_data
                    FROM org_events e
                    JOIN org_customers c ON e.org_customer_id = c.id
                    WHERE %s
                    %s
                    %s
                ) events
            ', v_where_clause, v_order_clause, v_limit_clause);
            
            -- Execute query
            EXECUTE v_query_sql INTO v_events;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'data', COALESCE(v_events, '[]'::jsonb)
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_queries_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Helper function to build WHERE clause with $or/$and/$not support - Enhanced with default AND behavior
CREATE OR REPLACE FUNCTION build_events_where_clause(
    p_organization_id UUID,
    p_target JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conditions TEXT[] := '{}';
    v_condition TEXT;
    v_key TEXT;
    v_value JSONB;
    v_or_conditions TEXT[] := '{}';
    v_and_conditions TEXT[] := '{}';
    v_not_condition TEXT;
    v_regular_field_conditions TEXT[] := '{}';
BEGIN
    -- Always filter by organization
    v_conditions := v_conditions || ('e.organization_id = ' || quote_literal(p_organization_id));
    
    -- Handle $or operator (explicit OR logic)
    IF p_target ? '$or' THEN
        FOR i IN 0..(jsonb_array_length(p_target->'$or') - 1) LOOP
            v_or_conditions := v_or_conditions || ('(' || build_single_condition_events(p_target->'$or'->i) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_or_conditions, ' OR ') || ')');
    END IF;
    
    -- Handle $and operator (explicit AND logic)
    IF p_target ? '$and' THEN
        FOR i IN 0..(jsonb_array_length(p_target->'$and') - 1) LOOP
            v_and_conditions := v_and_conditions || ('(' || build_single_condition_events(p_target->'$and'->i) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_and_conditions, ' AND ') || ')');
    END IF;
    
    -- Handle $not operator
    IF p_target ? '$not' THEN
        v_not_condition := build_single_condition_events(p_target->'$not');
        v_conditions := v_conditions || ('NOT (' || v_not_condition || ')');
    END IF;
    
    -- Handle regular fields (DEFAULT AND BEHAVIOR - like ice cream shop analogy)
    -- All regular fields are ANDed together by default
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_target) LOOP
        IF v_key NOT IN ('$or', '$and', '$not') THEN
            v_condition := build_field_condition_events(v_key, v_value);
            IF v_condition IS NOT NULL THEN
                v_regular_field_conditions := v_regular_field_conditions || v_condition;
            END IF;
        END IF;
    END LOOP;
    
    -- Add all regular field conditions with AND (default behavior)
    IF array_length(v_regular_field_conditions, 1) > 0 THEN
        v_conditions := v_conditions || v_regular_field_conditions;
    END IF;
    
    -- Return all conditions joined with AND
    RETURN array_to_string(v_conditions, ' AND ');
END;
$$;

-- Helper function to build single condition for events
CREATE OR REPLACE FUNCTION build_single_condition_events(p_condition JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conditions TEXT[] := '{}';
    v_condition TEXT;
    v_key TEXT;
    v_value JSONB;
    v_or_conditions TEXT[] := '{}';
    v_and_conditions TEXT[] := '{}';
    v_not_condition TEXT;
BEGIN
    -- Handle $or operator in nested conditions
    IF p_condition ? '$or' THEN
        FOR i IN 0..(jsonb_array_length(p_condition->'$or') - 1) LOOP
            v_or_conditions := v_or_conditions || ('(' || build_single_condition_events(p_condition->'$or'->i) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_or_conditions, ' OR ') || ')');
    END IF;
    
    -- Handle $and operator in nested conditions
    IF p_condition ? '$and' THEN
        FOR i IN 0..(jsonb_array_length(p_condition->'$and') - 1) LOOP
            v_and_conditions := v_and_conditions || ('(' || build_single_condition_events(p_condition->'$and'->i) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_and_conditions, ' AND ') || ')');
    END IF;
    
    -- Handle $not operator in nested conditions
    IF p_condition ? '$not' THEN
        v_not_condition := build_single_condition_events(p_condition->'$not');
        v_conditions := v_conditions || ('NOT (' || v_not_condition || ')');
    END IF;
    
    -- Handle regular fields
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_condition) LOOP
        IF v_key NOT IN ('$or', '$and', '$not') THEN
            v_condition := build_field_condition_events(v_key, v_value);
            IF v_condition IS NOT NULL THEN
                v_conditions := v_conditions || v_condition;
            END IF;
        END IF;
    END LOOP;
    
    -- Return conditions joined with AND (if no logical operators, just regular conditions)
    IF array_length(v_conditions, 1) > 0 THEN
        RETURN array_to_string(v_conditions, ' AND ');
    ELSE
        RETURN '1=1'; -- Always true fallback
    END IF;
END;
$$;

-- Helper function to build field condition for events - Enhanced with comprehensive field support
CREATE OR REPLACE FUNCTION build_field_condition_events(p_field TEXT, p_value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_db_field TEXT;
    v_condition TEXT;
    v_json_path TEXT;
BEGIN
    -- Handle direct field mapping first
    v_db_field := CASE p_field
        WHEN 'id' THEN 'e.id'
        WHEN 'title' THEN 'e.title'
        WHEN 'description' THEN 'e.description'
        WHEN 'type' THEN 'e.type'
        WHEN 'startTime' THEN 'e.start_time'
        WHEN 'endTime' THEN 'e.end_time'
        WHEN 'repeat' THEN 'e.repeat'
        WHEN 'color' THEN 'e.color'
        WHEN 'resource' THEN 'e.resource'
        WHEN 'customData' THEN 'e.custom_data'
        WHEN 'user' THEN 'c.id'
        WHEN 'user.email' THEN 'c.email'
        WHEN 'user.name' THEN 'c.name'
        WHEN 'user.identifier' THEN 'c.identifier'
        WHEN 'user.linkedUserId' THEN 'c.linked_user_id'
        WHEN 'userEmail' THEN 'c.email'
        WHEN 'userIdentifier' THEN 'c.identifier'
        WHEN 'linkedUserId' THEN 'c.linked_user_id'
        WHEN 'createdAt' THEN 'e.created_at'
        WHEN 'updatedAt' THEN 'e.updated_at'
        ELSE NULL
    END;
    
    -- Handle customData.* nested field access
    IF v_db_field IS NULL AND p_field LIKE 'customData.%' THEN
        v_json_path := substring(p_field from 12); -- Remove 'customData.' prefix
        v_db_field := 'e.custom_data->>''' || v_json_path || '''';
    END IF;
    
    -- Handle user.customData.* nested field access
    IF v_db_field IS NULL AND p_field LIKE 'user.customData.%' THEN
        v_json_path := substring(p_field from 17); -- Remove 'user.customData.' prefix
        v_db_field := 'c.custom_data->>''' || v_json_path || '''';
    END IF;
    
    -- If field is still not recognized, skip it
    IF v_db_field IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Handle operator objects or simple equality
    IF jsonb_typeof(p_value) = 'object' THEN
        RETURN build_operator_condition(v_db_field, p_value);
    ELSE
        -- Simple equality
        RETURN v_db_field || ' = ' || quote_literal(p_value#>>'{}');
    END IF;
END;
$$;

-- Helper function to build ORDER BY clause
CREATE OR REPLACE FUNCTION build_order_clause(p_sort_by TEXT, p_sort_order TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_db_field TEXT;
    v_order TEXT;
BEGIN
    -- Map API fields to database fields
    v_db_field := CASE p_sort_by
        WHEN 'title' THEN 'e.title'
        WHEN 'startTime' THEN 'e.start_time'
        WHEN 'endTime' THEN 'e.end_time'
        WHEN 'type' THEN 'e.type'
        WHEN 'createdAt' THEN 'e.created_at'
        WHEN 'updatedAt' THEN 'e.updated_at'
        ELSE 'e.created_at'
    END;
    
    v_order := CASE UPPER(p_sort_order)
        WHEN 'ASC' THEN 'ASC'
        WHEN 'DESC' THEN 'DESC'
        ELSE 'DESC'
    END;
    
    RETURN 'ORDER BY ' || v_db_field || ' ' || v_order;
END;
$$;

-- Helper function to build LIMIT clause
CREATE OR REPLACE FUNCTION build_limit_clause(p_limit INTEGER, p_offset INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_limit = -1 THEN
        -- No limit
        IF p_offset > 0 THEN
            RETURN 'OFFSET ' || p_offset;
        ELSE
            RETURN '';
        END IF;
    ELSE
        -- With limit
        IF p_offset > 0 THEN
            RETURN 'LIMIT ' || p_limit || ' OFFSET ' || p_offset;
        ELSE
            RETURN 'LIMIT ' || p_limit;
        END IF;
    END IF;
END;
$$;

-- Update Events Handler - Comprehensive Implementation
CREATE OR REPLACE FUNCTION process_update_events_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updates_array JSONB;
    v_update JSONB;
    v_target JSONB;
    v_data JSONB;
    v_update_options JSONB;
    v_merged_options JSONB;
    v_default_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_subquery_where TEXT;
    v_limit_clause TEXT;
    v_update_sql TEXT;
    v_updated_count INTEGER;
    v_error_message TEXT;
    v_limit INTEGER;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_updates_array := p_operation_data;
    ELSE
        v_updates_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each update
    FOR v_index in 0..(jsonb_array_length(v_updates_array) - 1) LOOP
        v_update := v_updates_array->v_index;
        v_target := v_update->'target';
        v_data := v_update->'updates';
        v_update_options := COALESCE(v_update->'options', '{}'::jsonb);
        
        -- Merge default options with update-specific options
        v_merged_options := v_default_options || v_update_options;
        
        -- Extract limit from options
        v_limit := COALESCE((v_merged_options->>'limit')::INTEGER, -1);
        
        v_error_message := NULL;
        
        BEGIN
            -- Validate required fields
            IF v_target IS NULL THEN
                RAISE EXCEPTION 'Target is required for update operation';
            END IF;
            
            IF v_data IS NULL THEN
                RAISE EXCEPTION 'Updates data is required for update operation';
            END IF;
            
            -- Build WHERE clause with support for complex operators
            v_where_clause := build_events_where_clause(p_organization_id, v_target);
            
            -- Build and execute UPDATE SQL (PostgreSQL doesn't support LIMIT in UPDATE directly)
            IF v_limit > 0 THEN
                -- For subquery, we need to build WHERE clause for events subquery
                v_update_sql := FORMAT('
                    UPDATE org_events e
                    SET 
                        title = COALESCE(%s, e.title),
                        description = COALESCE(%s, e.description),
                        start_time = COALESCE(%s::timestamp with time zone, e.start_time),
                        end_time = COALESCE(%s::timestamp with time zone, e.end_time),
                        repeat = COALESCE(%s, e.repeat),
                        type = COALESCE(%s, e.type),
                        color = COALESCE(%s, e.color),
                        resource = COALESCE(%s, e.resource),
                        custom_data = COALESCE(%s::jsonb, e.custom_data),
                        updated_at = NOW()
                    WHERE e.id IN (
                        SELECT e.id FROM org_events e
                        JOIN org_customers c ON e.org_customer_id = c.id
                        WHERE %s
                        LIMIT %s
                    )
                ',
                    CASE WHEN v_data ? 'title' THEN quote_literal(v_data->>'title') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'description' THEN quote_literal(v_data->>'description') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'startTime' THEN quote_literal(v_data->>'startTime') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'endTime' THEN quote_literal(v_data->>'endTime') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'repeat' THEN quote_literal(v_data->>'repeat') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'type' THEN quote_literal(v_data->>'type') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'color' THEN quote_literal(v_data->>'color') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'resource' THEN quote_literal(v_data->>'resource') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'customData' THEN quote_literal(v_data->'customData') ELSE 'NULL' END,
                    v_where_clause,
                    v_limit
                );
            ELSE
                -- No limit - direct update with join
                v_update_sql := FORMAT('
                    UPDATE org_events e
                    SET 
                        title = COALESCE(%s, e.title),
                        description = COALESCE(%s, e.description),
                        start_time = COALESCE(%s::timestamp with time zone, e.start_time),
                        end_time = COALESCE(%s::timestamp with time zone, e.end_time),
                        repeat = COALESCE(%s, e.repeat),
                        type = COALESCE(%s, e.type),
                        color = COALESCE(%s, e.color),
                        resource = COALESCE(%s, e.resource),
                        custom_data = COALESCE(%s::jsonb, e.custom_data),
                        updated_at = NOW()
                    FROM org_customers c
                    WHERE e.org_customer_id = c.id AND %s
                ',
                    CASE WHEN v_data ? 'title' THEN quote_literal(v_data->>'title') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'description' THEN quote_literal(v_data->>'description') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'startTime' THEN quote_literal(v_data->>'startTime') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'endTime' THEN quote_literal(v_data->>'endTime') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'repeat' THEN quote_literal(v_data->>'repeat') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'type' THEN quote_literal(v_data->>'type') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'color' THEN quote_literal(v_data->>'color') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'resource' THEN quote_literal(v_data->>'resource') ELSE 'NULL' END,
                    CASE WHEN v_data ? 'customData' THEN quote_literal(v_data->'customData') ELSE 'NULL' END,
                    v_where_clause
                );
            END IF;
            
            -- Execute update
            EXECUTE v_update_sql;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'updatedCount', v_updated_count
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_updates_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Delete Events Handler - Comprehensive Implementation
CREATE OR REPLACE FUNCTION process_delete_events_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deletes_array JSONB;
    v_delete JSONB;
    v_target JSONB;
    v_delete_options JSONB;
    v_merged_options JSONB;
    v_default_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_subquery_where TEXT;
    v_limit_clause TEXT;
    v_delete_sql TEXT;
    v_deleted_count INTEGER;
    v_error_message TEXT;
    v_limit INTEGER;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_deletes_array := p_operation_data;
    ELSE
        v_deletes_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each delete
    FOR v_index in 0..(jsonb_array_length(v_deletes_array) - 1) LOOP
        v_delete := v_deletes_array->v_index;
        v_target := v_delete->'target';
        v_delete_options := COALESCE(v_delete->'options', '{}'::jsonb);
        
        -- Merge default options with delete-specific options
        v_merged_options := v_default_options || v_delete_options;
        
        -- Extract limit from options
        v_limit := COALESCE((v_merged_options->>'limit')::INTEGER, -1);
        
        v_error_message := NULL;
        
        BEGIN
            -- Validate required fields
            IF v_target IS NULL THEN
                RAISE EXCEPTION 'Target is required for delete operation';
            END IF;
            
            -- Build WHERE clause with support for complex operators
            v_where_clause := build_events_where_clause(p_organization_id, v_target);
            
            -- Build and execute DELETE SQL (PostgreSQL doesn't support LIMIT in DELETE directly)
            IF v_limit > 0 THEN
                -- For subquery with limit
                v_delete_sql := FORMAT('
                    DELETE FROM org_events e
                    WHERE e.id IN (
                        SELECT e.id FROM org_events e
                        JOIN org_customers c ON e.org_customer_id = c.id
                        WHERE %s
                        LIMIT %s
                    )
                ', v_where_clause, v_limit);
            ELSE
                -- No limit - direct delete with join
                v_delete_sql := FORMAT('
                    DELETE FROM org_events e
                    USING org_customers c
                    WHERE e.org_customer_id = c.id AND %s
                ', v_where_clause);
            END IF;
            
            -- Execute delete
            EXECUTE v_delete_sql;
            GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'deletedCount', v_deleted_count
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_deletes_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Create Users Handler - Comprehensive Implementation
CREATE OR REPLACE FUNCTION process_create_users_comprehensive(
    p_organization_id UUID,
    p_org_name TEXT,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_users_array JSONB;
    v_user JSONB;
    v_user_data JSONB;
    v_user_options JSONB;
    v_merged_options JSONB;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_is_batch BOOLEAN;
    v_customer_id UUID;
    v_error_message TEXT;
    v_index INTEGER := 0;
    v_default_options JSONB;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_users_array := p_operation_data;
    ELSE
        v_users_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each user
    FOR v_index in 0..(jsonb_array_length(v_users_array) - 1) LOOP
        v_user := v_users_array->v_index;
        
        -- Extract user and options from the user structure
        IF v_user ? 'user' THEN
            v_user_data := v_user->'user';
            v_user_options := COALESCE(v_user->'options', '{}'::jsonb);
        ELSE
            v_user_data := v_user;
            v_user_options := '{}'::jsonb;
        END IF;
        
        -- Merge default options with user-specific options
        v_merged_options := v_default_options || v_user_options;
        
        v_error_message := NULL;
        
        BEGIN
            -- Validate required fields
            IF v_user_data->>'identifier' IS NULL THEN
                RAISE EXCEPTION 'User identifier is required';
            END IF;
            
            -- Create or get customer
            DECLARE
                v_customer_result RECORD;
            BEGIN
                SELECT * INTO v_customer_result FROM get_or_create_customer_enhanced(
                    p_organization_id,
                    p_org_name,
                    v_user_data,
                    CASE 
                        WHEN v_merged_options ? 'isSigned' THEN v_merged_options->'isSigned'
                        ELSE 'false'::jsonb
                    END
                );
                
                v_customer_id := v_customer_result.customer_id;
                
                -- Check if we should reject user creation (though this might not apply to direct user creation)
                IF v_customer_result.should_reject_event THEN
                    v_results := v_results || jsonb_build_object(
                        'index', v_index,
                        'success', false,
                        'error', v_customer_result.reject_message,
                        'customerId', v_customer_id
                    );
                    v_failed_count := v_failed_count + 1;
                    CONTINUE; -- Skip to next user
                END IF;
            END;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'customerId', v_customer_id
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_users_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Get Users Handler - Comprehensive Implementation
CREATE OR REPLACE FUNCTION process_get_users_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queries_array JSONB;
    v_query JSONB;
    v_target JSONB;
    v_query_options JSONB;
    v_default_options JSONB;
    v_merged_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_order_clause TEXT;
    v_limit_clause TEXT;
    v_query_sql TEXT;
    v_users JSONB;
    v_error_message TEXT;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_queries_array := p_operation_data;
    ELSE
        v_queries_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each query
    FOR v_index in 0..(jsonb_array_length(v_queries_array) - 1) LOOP
        v_query := v_queries_array->v_index;
        v_target := v_query->'target';
        v_query_options := COALESCE(v_query->'options', '{}'::jsonb);
        
        -- Merge default options with query-specific options
        v_merged_options := v_default_options || v_query_options;
        
        v_error_message := NULL;
        
        BEGIN
            -- Build WHERE clause with support for $or, $and, $not operators
            v_where_clause := build_users_where_clause(p_organization_id, v_target, 'c');
            
            -- Build ORDER BY clause
            v_order_clause := build_users_order_clause(
                COALESCE(v_merged_options->>'sortBy', 'created_at'),
                COALESCE(v_merged_options->>'sortOrder', 'desc')
            );
            
            -- Build LIMIT clause
            v_limit_clause := build_limit_clause(
                COALESCE((v_merged_options->>'limit')::integer, 50),
                COALESCE((v_merged_options->>'offset')::integer, 0)
            );
            
            -- Build final query (fix GROUP BY issue by using subquery)
            v_query_sql := FORMAT('
                SELECT COALESCE(jsonb_agg(user_data), ''[]''::jsonb)
                FROM (
                    SELECT jsonb_build_object(
                        ''id'', c.identifier,
                        ''name'', c.name,
                        ''email'', c.email,
                        ''customData'', c.custom_data,
                        ''linkedUserId'', CASE WHEN c.linked_user_id IS NOT NULL THEN c.linked_user_id::text ELSE null END,
                        ''createdAt'', c.created_at,
                        ''updatedAt'', c.updated_at
                    ) as user_data
                    FROM org_customers c
                    WHERE %s
                    %s
                    %s
                ) users
            ', v_where_clause, v_order_clause, v_limit_clause);
            
            -- Execute query
            EXECUTE v_query_sql INTO v_users;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'data', COALESCE(v_users, '[]'::jsonb)
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_queries_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Helper function to build WHERE clause for users with $or/$and/$not support
-- Helper function to build WHERE clause for users with default AND behavior
CREATE OR REPLACE FUNCTION build_users_where_clause(
    p_organization_id UUID,
    p_target JSONB,
    p_table_alias TEXT DEFAULT 'c'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conditions TEXT[] := '{}';
    v_condition TEXT;
    v_key TEXT;
    v_value JSONB;
    v_or_conditions TEXT[] := '{}';
    v_and_conditions TEXT[] := '{}';
    v_not_condition TEXT;
    v_regular_field_conditions TEXT[] := '{}';
BEGIN
    -- Always filter by organization
    v_conditions := v_conditions || (CASE WHEN p_table_alias = '' THEN 'organization_id' ELSE p_table_alias || '.organization_id' END || ' = ' || quote_literal(p_organization_id));
    
    -- Handle $or operator (explicit OR logic)
    IF p_target ? '$or' THEN
        FOR i IN 0..(jsonb_array_length(p_target->'$or') - 1) LOOP
            v_or_conditions := v_or_conditions || ('(' || build_single_condition_users(p_target->'$or'->i, p_table_alias) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_or_conditions, ' OR ') || ')');
    END IF;
    
    -- Handle $and operator (explicit AND logic)
    IF p_target ? '$and' THEN
        FOR i IN 0..(jsonb_array_length(p_target->'$and') - 1) LOOP
            v_and_conditions := v_and_conditions || ('(' || build_single_condition_users(p_target->'$and'->i, p_table_alias) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_and_conditions, ' AND ') || ')');
    END IF;
    
    -- Handle $not operator
    IF p_target ? '$not' THEN
        v_not_condition := build_single_condition_users(p_target->'$not', p_table_alias);
        v_conditions := v_conditions || ('NOT (' || v_not_condition || ')');
    END IF;
    
    -- Handle regular fields (DEFAULT AND BEHAVIOR)
    -- All regular fields are ANDed together by default
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_target) LOOP
        IF v_key NOT IN ('$or', '$and', '$not') THEN
            v_condition := build_field_condition_users(v_key, v_value, p_table_alias);
            IF v_condition IS NOT NULL THEN
                v_regular_field_conditions := v_regular_field_conditions || v_condition;
            END IF;
        END IF;
    END LOOP;
    
    -- Add all regular field conditions with AND (default behavior)
    IF array_length(v_regular_field_conditions, 1) > 0 THEN
        v_conditions := v_conditions || v_regular_field_conditions;
    END IF;
    
    -- Return all conditions joined with AND
    RETURN array_to_string(v_conditions, ' AND ');
END;
$$;

-- Helper function to build single condition for users
CREATE OR REPLACE FUNCTION build_single_condition_users(p_condition JSONB, p_table_alias TEXT DEFAULT 'c')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conditions TEXT[] := '{}';
    v_condition TEXT;
    v_key TEXT;
    v_value JSONB;
    v_or_conditions TEXT[] := '{}';
    v_and_conditions TEXT[] := '{}';
    v_not_condition TEXT;
BEGIN
    -- Handle $or operator in nested conditions
    IF p_condition ? '$or' THEN
        FOR i IN 0..(jsonb_array_length(p_condition->'$or') - 1) LOOP
            v_or_conditions := v_or_conditions || ('(' || build_single_condition_users(p_condition->'$or'->i, p_table_alias) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_or_conditions, ' OR ') || ')');
    END IF;
    
    -- Handle $and operator in nested conditions
    IF p_condition ? '$and' THEN
        FOR i IN 0..(jsonb_array_length(p_condition->'$and') - 1) LOOP
            v_and_conditions := v_and_conditions || ('(' || build_single_condition_users(p_condition->'$and'->i, p_table_alias) || ')');
        END LOOP;
        v_conditions := v_conditions || ('(' || array_to_string(v_and_conditions, ' AND ') || ')');
    END IF;
    
    -- Handle $not operator in nested conditions
    IF p_condition ? '$not' THEN
        v_not_condition := build_single_condition_users(p_condition->'$not', p_table_alias);
        v_conditions := v_conditions || ('NOT (' || v_not_condition || ')');
    END IF;
    
    -- Handle regular fields
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_condition) LOOP
        IF v_key NOT IN ('$or', '$and', '$not') THEN
            v_condition := build_field_condition_users(v_key, v_value, p_table_alias);
            IF v_condition IS NOT NULL THEN
                v_conditions := v_conditions || v_condition;
            END IF;
        END IF;
    END LOOP;
    
    -- Return conditions joined with AND (if no logical operators, just regular conditions)
    IF array_length(v_conditions, 1) > 0 THEN
        RETURN array_to_string(v_conditions, ' AND ');
    ELSE
        RETURN '1=1'; -- Always true fallback
    END IF;
END;
$$;

-- Helper function to build field condition for users - Enhanced with comprehensive field support
CREATE OR REPLACE FUNCTION build_field_condition_users(p_field TEXT, p_value JSONB, p_table_alias TEXT DEFAULT 'c')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_db_field TEXT;
    v_condition TEXT;
    v_json_path TEXT;
BEGIN
    -- Handle direct field mapping first
    v_db_field := CASE p_field
        WHEN 'id' THEN CASE WHEN p_table_alias = '' THEN 'id' ELSE p_table_alias || '.id' END
        WHEN 'identifier' THEN CASE WHEN p_table_alias = '' THEN 'identifier' ELSE p_table_alias || '.identifier' END
        WHEN 'name' THEN CASE WHEN p_table_alias = '' THEN 'name' ELSE p_table_alias || '.name' END
        WHEN 'email' THEN CASE WHEN p_table_alias = '' THEN 'email' ELSE p_table_alias || '.email' END
        WHEN 'customData' THEN CASE WHEN p_table_alias = '' THEN 'custom_data' ELSE p_table_alias || '.custom_data' END
        WHEN 'linkedUserId' THEN CASE WHEN p_table_alias = '' THEN 'linked_user_id' ELSE p_table_alias || '.linked_user_id' END
        WHEN 'createdAt' THEN CASE WHEN p_table_alias = '' THEN 'created_at' ELSE p_table_alias || '.created_at' END
        WHEN 'updatedAt' THEN CASE WHEN p_table_alias = '' THEN 'updated_at' ELSE p_table_alias || '.updated_at' END
        ELSE NULL
    END;
    
    -- Handle customData.* nested field access
    IF v_db_field IS NULL AND p_field LIKE 'customData.%' THEN
        v_json_path := substring(p_field from 12); -- Remove 'customData.' prefix
        v_db_field := CASE WHEN p_table_alias = '' THEN 'custom_data->>''' || v_json_path || '''' 
                           ELSE p_table_alias || '.custom_data->>''' || v_json_path || '''' END;
    END IF;
    
    -- If field is still not recognized, skip it
    IF v_db_field IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Handle operator objects or simple equality
    IF jsonb_typeof(p_value) = 'object' THEN
        RETURN build_operator_condition(v_db_field, p_value);
    ELSE
        -- Simple equality
        RETURN v_db_field || ' = ' || quote_literal(p_value#>>'{}');
    END IF;
END;
$$;

-- Helper function to build ORDER BY clause for users
CREATE OR REPLACE FUNCTION build_users_order_clause(p_sort_by TEXT, p_sort_order TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_db_field TEXT;
    v_order TEXT;
BEGIN
    -- Map API fields to database fields
    v_db_field := CASE p_sort_by
        WHEN 'id' THEN 'c.id'
        WHEN 'name' THEN 'c.name'
        WHEN 'email' THEN 'c.email'
        WHEN 'identifier' THEN 'c.identifier'
        WHEN 'linkedUserId' THEN 'c.linked_user_id'
        WHEN 'createdAt' THEN 'c.created_at'
        WHEN 'updatedAt' THEN 'c.updated_at'
        ELSE 'c.created_at'
    END;
    
    v_order := CASE UPPER(p_sort_order)
        WHEN 'ASC' THEN 'ASC'
        WHEN 'DESC' THEN 'DESC'
        ELSE 'DESC'
    END;
    
    RETURN 'ORDER BY ' || v_db_field || ' ' || v_order;
END;
$$;

-- Helper function to build operator conditions for queries - Enhanced with proper array handling
CREATE OR REPLACE FUNCTION build_operator_condition(p_field TEXT, p_operators JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_condition TEXT;
    v_conditions TEXT[] := '{}';
    v_key TEXT;
    v_value JSONB;
    v_array_elements TEXT[] := '{}';
    v_element JSONB;
    i INTEGER;
BEGIN
    -- Handle different query operators
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_operators) LOOP
        CASE v_key
            WHEN '$eq' THEN
                v_condition := p_field || ' = ' || quote_literal(v_value#>>'{}');
            WHEN '$ne' THEN
                v_condition := p_field || ' != ' || quote_literal(v_value#>>'{}');
            WHEN '$gt' THEN
                v_condition := p_field || ' > ' || quote_literal(v_value#>>'{}');
            WHEN '$gte' THEN
                v_condition := p_field || ' >= ' || quote_literal(v_value#>>'{}');
            WHEN '$lt' THEN
                v_condition := p_field || ' < ' || quote_literal(v_value#>>'{}');
            WHEN '$lte' THEN
                v_condition := p_field || ' <= ' || quote_literal(v_value#>>'{}');
            WHEN '$in' THEN
                -- Handle $in operator with proper array processing
                v_array_elements := '{}';
                IF jsonb_typeof(v_value) = 'array' THEN
                    FOR i IN 0..(jsonb_array_length(v_value) - 1) LOOP
                        v_element := v_value->i;
                        v_array_elements := v_array_elements || quote_literal(v_element#>>'{}');
                    END LOOP;
                    v_condition := p_field || ' IN (' || array_to_string(v_array_elements, ', ') || ')';
                ELSE
                    -- Single value treated as array of one
                    v_condition := p_field || ' = ' || quote_literal(v_value#>>'{}');
                END IF;
            WHEN '$nin' THEN
                -- Handle $nin operator with proper array processing
                v_array_elements := '{}';
                IF jsonb_typeof(v_value) = 'array' THEN
                    FOR i IN 0..(jsonb_array_length(v_value) - 1) LOOP
                        v_element := v_value->i;
                        v_array_elements := v_array_elements || quote_literal(v_element#>>'{}');
                    END LOOP;
                    v_condition := p_field || ' NOT IN (' || array_to_string(v_array_elements, ', ') || ')';
                ELSE
                    -- Single value treated as array of one
                    v_condition := p_field || ' != ' || quote_literal(v_value#>>'{}');
                END IF;
            WHEN '$like' THEN
                v_condition := p_field || ' LIKE ' || quote_literal(v_value#>>'{}');
            WHEN '$ilike' THEN
                v_condition := p_field || ' ILIKE ' || quote_literal(v_value#>>'{}');
            WHEN '$regex' THEN
                v_condition := p_field || ' ~ ' || quote_literal(v_value#>>'{}');
            WHEN '$exists' THEN
                IF (v_value#>>'{}')::boolean THEN
                    v_condition := p_field || ' IS NOT NULL';
                ELSE
                    v_condition := p_field || ' IS NULL';
                END IF;
            ELSE
                -- Skip unknown operators
                CONTINUE;
        END CASE;
        
        IF v_condition IS NOT NULL THEN
            v_conditions := v_conditions || v_condition;
        END IF;
    END LOOP;
    
    -- Return combined conditions (multiple operators in same field are ANDed)
    IF array_length(v_conditions, 1) > 0 THEN
        RETURN array_to_string(v_conditions, ' AND ');
    ELSE
        RETURN '1=1'; -- Always true fallback
    END IF;
END;
$$;

-- Update Users Handler - Comprehensive Implementation with Complex Query Support
CREATE OR REPLACE FUNCTION process_update_users_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updates_array JSONB;
    v_update JSONB;
    v_target JSONB;
    v_updates JSONB;
    v_update_options JSONB;
    v_default_options JSONB;
    v_merged_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_subquery_where TEXT;
    v_limit_clause TEXT;
    v_update_sql TEXT;
    v_set_clauses TEXT[] := '{}';
    v_set_clause TEXT;
    v_updated_count INTEGER;
    v_error_message TEXT;
    v_limit INTEGER;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_updates_array := p_operation_data;
    ELSE
        v_updates_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each update
    FOR v_index in 0..(jsonb_array_length(v_updates_array) - 1) LOOP
        v_update := v_updates_array->v_index;
        v_target := v_update->'target';
        v_updates := v_update->'updates';
        v_update_options := COALESCE(v_update->'options', '{}'::jsonb);
        
        -- Merge default options with update-specific options
        v_merged_options := v_default_options || v_update_options;
        
        -- Extract limit from options
        v_limit := COALESCE((v_merged_options->>'limit')::INTEGER, -1);
        
        v_error_message := NULL;
        v_set_clauses := '{}';
        
        BEGIN
            -- Validate required fields
            IF v_target IS NULL THEN
                RAISE EXCEPTION 'Target is required for update operation';
            END IF;
            
            IF v_updates IS NULL THEN
                RAISE EXCEPTION 'Updates data is required for update operation';
            END IF;
            
            -- Validate linkedUserId if provided
            IF v_updates ? 'linkedUserId' AND v_updates->>'linkedUserId' IS NOT NULL AND v_updates->>'linkedUserId' != '' THEN
                -- Check if the linkedUserId exists in the users table
                PERFORM 1 FROM users WHERE id = (v_updates->>'linkedUserId')::UUID;
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Invalid linkedUserId: %. User does not exist in the users table.', v_updates->>'linkedUserId';
                END IF;
            END IF;
            
            -- Build WHERE clause with support for complex operators
            v_where_clause := build_users_where_clause(p_organization_id, v_target, 'c');
            
            -- Build SET clauses from updates data
            IF v_updates ? 'identifier' THEN
                v_set_clauses := v_set_clauses || ARRAY['identifier = ' || quote_literal(v_updates->>'identifier')];
            END IF;
            
            IF v_updates ? 'name' THEN
                v_set_clauses := v_set_clauses || ARRAY['name = ' || quote_literal(v_updates->>'name')];
            END IF;
            
            IF v_updates ? 'email' THEN
                v_set_clauses := v_set_clauses || ARRAY['email = ' || quote_literal(v_updates->>'email')];
            END IF;
            
            IF v_updates ? 'customData' THEN
                v_set_clauses := v_set_clauses || ARRAY['custom_data = ' || quote_literal(v_updates->'customData'::text)];
            END IF;
            
            IF v_updates ? 'linkedUserId' THEN
                IF v_updates->>'linkedUserId' IS NULL THEN
                    v_set_clauses := v_set_clauses || ARRAY['linked_user_id = NULL'];
                ELSE
                    v_set_clauses := v_set_clauses || ARRAY['linked_user_id = ' || quote_literal(v_updates->>'linkedUserId'::UUID)];
                END IF;
            END IF;
            
            -- Always update the updated_at timestamp
            v_set_clauses := v_set_clauses || ARRAY['updated_at = NOW()'];
            
            -- Build SET clause
            IF array_length(v_set_clauses, 1) = 0 THEN
                RAISE EXCEPTION 'No valid fields provided for update';
            END IF;
            
            v_set_clause := array_to_string(v_set_clauses, ', ');
            
            -- Build limit clause
            IF v_limit > 0 THEN
                v_limit_clause := ' LIMIT ' || v_limit;
            ELSE
                v_limit_clause := '';
            END IF;
            
            -- Build and execute UPDATE SQL (PostgreSQL doesn't support LIMIT in UPDATE directly)
            IF v_limit > 0 THEN
                -- For subquery, we need to build WHERE clause without table alias
                v_subquery_where := build_users_where_clause(p_organization_id, v_target, '');
                v_update_sql := 'UPDATE org_customers c SET ' || v_set_clause || 
                               ' WHERE c.id IN (SELECT id FROM org_customers WHERE ' || v_subquery_where || ' LIMIT ' || v_limit || ')';
            ELSE
                v_update_sql := 'UPDATE org_customers c SET ' || v_set_clause || 
                               ' WHERE ' || v_where_clause;
            END IF;
            
            -- Execute update and get count
            EXECUTE v_update_sql;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'updatedCount', v_updated_count,
                'target', v_target,
                'updates', v_updates
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message,
                    'target', v_target,
                    'updates', v_updates
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_updates_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

-- Delete Users Handler - Comprehensive Implementation with Complex Query Support
CREATE OR REPLACE FUNCTION process_delete_users_comprehensive(
    p_organization_id UUID,
    p_operation_data JSONB,
    p_operation_options JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deletes_array JSONB;
    v_delete JSONB;
    v_target JSONB;
    v_delete_options JSONB;
    v_default_options JSONB;
    v_merged_options JSONB;
    v_is_batch BOOLEAN;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_index INTEGER := 0;
    v_where_clause TEXT;
    v_subquery_where TEXT;
    v_limit_clause TEXT;
    v_delete_sql TEXT;
    v_deleted_count INTEGER;
    v_error_message TEXT;
    v_limit INTEGER;
BEGIN
    -- Extract default options
    v_default_options := COALESCE(p_operation_options->'defaultOptions', '{}'::jsonb);
    
    -- Determine if this is batch or single operation
    v_is_batch := jsonb_typeof(p_operation_data) = 'array';
    
    IF v_is_batch THEN
        v_deletes_array := p_operation_data;
    ELSE
        v_deletes_array := jsonb_build_array(p_operation_data);
    END IF;
    
    -- Process each delete
    FOR v_index in 0..(jsonb_array_length(v_deletes_array) - 1) LOOP
        v_delete := v_deletes_array->v_index;
        v_target := v_delete->'target';
        v_delete_options := COALESCE(v_delete->'options', '{}'::jsonb);
        
        -- Merge default options with delete-specific options
        v_merged_options := v_default_options || v_delete_options;
        
        -- Extract limit from options
        v_limit := COALESCE((v_merged_options->>'limit')::INTEGER, -1);
        
        v_error_message := NULL;
        
        BEGIN
            -- Validate required fields
            IF v_target IS NULL THEN
                RAISE EXCEPTION 'Target is required for delete operation';
            END IF;
            
            -- Build WHERE clause with support for complex operators
            v_where_clause := build_users_where_clause(p_organization_id, v_target, 'c');
            
            -- Build limit clause
            IF v_limit > 0 THEN
                v_limit_clause := ' LIMIT ' || v_limit;
            ELSE
                v_limit_clause := '';
            END IF;
            
            -- Build and execute DELETE SQL (PostgreSQL doesn't support LIMIT in DELETE directly)
            IF v_limit > 0 THEN
                -- For subquery, we need to build WHERE clause without table alias
                v_subquery_where := build_users_where_clause(p_organization_id, v_target, '');
                v_delete_sql := 'DELETE FROM org_customers c WHERE c.id IN (SELECT id FROM org_customers WHERE ' || v_subquery_where || ' LIMIT ' || v_limit || ')';
            ELSE
                v_delete_sql := 'DELETE FROM org_customers c WHERE ' || v_where_clause;
            END IF;
            
            -- Execute delete and get count
            EXECUTE v_delete_sql;
            GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
            
            -- Add successful result
            v_results := v_results || jsonb_build_object(
                'index', v_index,
                'success', true,
                'deletedCount', v_deleted_count,
                'target', v_target
            );
            v_success_count := v_success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_message := SQLERRM;
                v_results := v_results || jsonb_build_object(
                    'index', v_index,
                    'success', false,
                    'error', v_error_message,
                    'target', v_target
                );
                v_failed_count := v_failed_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', v_failed_count = 0,
        'results', array_to_json(v_results)::jsonb,
        'summary', jsonb_build_object(
            'total', jsonb_array_length(v_deletes_array),
            'successful', v_success_count,
            'failed', v_failed_count
        )
    );
END;
$$;

