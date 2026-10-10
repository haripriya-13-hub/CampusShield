// All calls to the Flask backend go through here.
const KEY = "campusshield_token";

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t) => sessionStorage.setItem(KEY, t);
export const clearToken = () => sessionStorage.removeItem(KEY);

async function request(method, url, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  let payload;
  if (body !== undefined) {
    if (isForm) {
      payload = body; // FormData: the browser sets the content type
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw Object.assign(new Error("Cannot reach the server. Is the backend running on port 5000?"), { status: 0 });
  }

  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status });
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body ?? {}),
  put: (url, body) => request("PUT", url, body),
  patch: (url, body) => request("PATCH", url, body),
  upload: (url, formData) => request("POST", url, formData, true),
};
