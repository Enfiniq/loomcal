// Utility functions for migrating org_customer data to user_events when a user signs up
import { supabaseAdmin } from "./supabase";

export interface MigrationResult {
  success: boolean;
  migratedEventsCount: number;
  orgCustomersLinked: number;
  error?: string;
}

/**
 * Migrate org_customer data to user_events when a user signs up to LoomCal
 * This links external API usage to the new LoomCal user account
 */
export async function migrateOrgCustomerToUser(
  userEmail: string,
  userId: string
): Promise<MigrationResult> {
  try {
    // Find all org_customers with this email that aren't already linked
    const { data: orgCustomers, error: fetchError } = await supabaseAdmin
      .from("org_customers")
      .select(
        `
        id,
        organization_id,
        identifier,
        composite_id,
        name,
        email,
        custom_data,
        organizations!inner(name)
      `
      )
      .eq("email", userEmail)
      .is("linked_user_id", null);

    if (fetchError) {
      console.error("Error fetching org_customers:", fetchError);
      return {
        success: false,
        migratedEventsCount: 0,
        orgCustomersLinked: 0,
        error: fetchError.message,
      };
    }

    if (!orgCustomers || orgCustomers.length === 0) {
      return {
        success: true,
        migratedEventsCount: 0,
        orgCustomersLinked: 0,
      };
    }

    let totalMigratedEvents = 0;
    let linkedCustomers = 0;

    // Process each org_customer
    for (const orgCustomer of orgCustomers) {
      // Link the org_customer to the user
      const { error: linkError } = await supabaseAdmin
        .from("org_customers")
        .update({ linked_user_id: userId })
        .eq("id", orgCustomer.id);

      if (linkError) {
        console.error(
          `Error linking org_customer ${orgCustomer.id}:`,
          linkError
        );
        continue;
      }

      linkedCustomers++;

      // Get all org_events for this org_customer
      const { data: orgEvents, error: eventsError } = await supabaseAdmin
        .from("org_events")
        .select("*")
        .eq("org_customer_id", orgCustomer.id);

      if (eventsError) {
        console.error(
          `Error fetching org_events for customer ${orgCustomer.id}:`,
          eventsError
        );
        continue;
      }

      if (!orgEvents || orgEvents.length === 0) {
        continue;
      }

      // Convert org_events to user_events format
      const userEvents = orgEvents.map((orgEvent) => ({
        user_id: userId,
        title: orgEvent.title,
        description: orgEvent.description,
        start_time: orgEvent.start_time,
        end_time: orgEvent.end_time,
        all_day: false,
        color: orgEvent.color,
        resource: orgEvent.resource,
        type: `Imported from ${
          (orgCustomer.organizations as { name?: string })?.name || "External"
        }`,
        custom_data: {
          ...orgEvent.custom_data,
          // Add migration metadata
          _migrated: true,
          _original_org_event_id: orgEvent.id,
          _source_organization: (orgCustomer.organizations as { name?: string })
            ?.name,
          _source_composite_id: orgCustomer.composite_id,
          _migration_date: new Date().toISOString(),
        },
      }));

      // Insert user_events
      const { error: insertError } = await supabaseAdmin
        .from("user_events")
        .insert(userEvents);

      if (insertError) {
        console.error(
          `Error inserting user_events for customer ${orgCustomer.id}:`,
          insertError
        );
        continue;
      }

      totalMigratedEvents += userEvents.length;
    }

    return {
      success: true,
      migratedEventsCount: totalMigratedEvents,
      orgCustomersLinked: linkedCustomers,
    };
  } catch (error) {
    console.error("Migration error:", error);
    return {
      success: false,
      migratedEventsCount: 0,
      orgCustomersLinked: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Get migration preview for a user email
 * Shows what would be migrated without actually doing it
 */
export async function getMigrationPreview(userEmail: string) {
  try {
    const { data: orgCustomers, error } = await supabaseAdmin
      .from("org_customers")
      .select(
        `
        id,
        composite_id,
        name,
        type,
        organizations!inner(name),
        org_events(count)
      `
      )
      .eq("email", userEmail)
      .is("linked_user_id", null);

    if (error) {
      throw error;
    }

    return {
      success: true,
      preview:
        orgCustomers?.map((customer) => ({
          organizationName: (customer.organizations as { name?: string })?.name,
          compositeId: customer.composite_id,
          customerName: customer.name,
          customerType: customer.type,
          eventCount:
            (customer.org_events as { count?: number }[])?.[0]?.count || 0,
        })) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
