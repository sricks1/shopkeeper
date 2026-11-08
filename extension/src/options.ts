import { getBaseUrl, setBaseUrl } from "./settings.js";

const form = document.querySelector<HTMLFormElement>("#options");
const input = document.querySelector<HTMLInputElement>("#baseUrl");
const status = document.querySelector<HTMLElement>("#status");

if (form && input && status) {
  getBaseUrl().then((url) => {
    input.value = url;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setBaseUrl(input.value);
    input.value = await getBaseUrl();
    status.textContent = "Saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1500);
  });
}
