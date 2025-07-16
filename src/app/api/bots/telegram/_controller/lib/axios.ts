import axios from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

export function getAxiosInstance() {
  return {
    get(method: string, params?: Record<string, unknown>) {
      return axios.get(`/${method}`, {
        baseURL: BASE_URL,
        params,
      });
    },
    post(method: string, data?: Record<string, unknown>) {
      return axios({
        method: "post",
        baseURL: BASE_URL,
        url: `/${method}`,
        data,
      });
    },
  };
}
