const themeToggle = document.getElementById("themeToggle");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const submitButton = document.getElementById("submitButton");

document.getElementById("year").textContent =
  new Date().getFullYear();

function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(dark));
}

let savedTheme = null;

try {
  savedTheme = localStorage.getItem("portfolio-theme");
} catch {
  // The theme still works when browser storage is unavailable.
}

const prefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;

applyTheme(
  savedTheme === "dark" ||
  (savedTheme === null && prefersDark)
);

themeToggle.addEventListener("click", () => {
  const dark = !document.body.classList.contains("dark");

  applyTheme(dark);

  try {
    localStorage.setItem(
      "portfolio-theme",
      dark ? "dark" : "light"
    );
  } catch {
    // Saving the preference is optional.
  }
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  formStatus.textContent = "";
  formStatus.className = "";

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  const formData = new FormData(contactForm);

  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to send message.");
    }

    formStatus.textContent = result.message;
    formStatus.className = "success";
    contactForm.reset();
  } catch (error) {
    formStatus.textContent = error instanceof TypeError
      ? "Could not reach the contact server. Open the portfolio at http://localhost:3000 and make sure npm start is running."
      : error.message || "Unable to connect to the server.";
    formStatus.className = "error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send Message";
  }
});