// Load HTML and initialize
document.addEventListener("DOMContentLoaded", function () {

fetch("/QuickEnquiry.html")
        .then(res => res.text())
        .then(html => {
            document.body.insertAdjacentHTML("beforeend", html);
            initQuickEnquiry();
        });

});

function initQuickEnquiry() {

    const btn = document.getElementById("quickEnquiryBtn");
    const modal = document.getElementById("quickEnquiryModal");
    const closeBtn = document.querySelector(".close-btn");
    const sendBtn = document.getElementById("qeSendBtn");

    if (!btn || !modal) return;

    btn.onclick = function () {
        modal.style.display = "block";
    };

    closeBtn.onclick = function () {
        modal.style.display = "none";
    };

  sendBtn.onclick = async  function () {

    const name = document.getElementById("qeName");
    const email = document.getElementById("qeEmail");
    const phone = document.getElementById("qePhone");
    const message = document.getElementById("qeMessage");

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const phoneError = document.getElementById("phoneError");
    const messageError = document.getElementById("messageError");

    const successMsg = document.getElementById("qeSuccessMsg");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9]{10}$/;

    // Reset errors
    nameError.textContent = "";
    emailError.textContent = "";
    phoneError.textContent = "";
    messageError.textContent = "";
    successMsg.textContent = "";

    name.classList.remove("input-error");
    email.classList.remove("input-error");
    phone.classList.remove("input-error");
    message.classList.remove("input-error");

    let isValid = true;

    if (name.value.trim() === "") {
        nameError.textContent = "Name is required";
        name.classList.add("input-error");
        isValid = false;
    }

    if (email.value.trim() === "") {
        emailError.textContent = "Email is required";
        email.classList.add("input-error");
        isValid = false;
    } else if (!emailPattern.test(email.value.trim())) {
        emailError.textContent = "Enter valid email";
        email.classList.add("input-error");
        isValid = false;
    }

    if (phone.value.trim() === "") {
        phoneError.textContent = "Phone number is required";
        phone.classList.add("input-error");
        isValid = false;
    } else if (!phonePattern.test(phone.value.trim())) {
        phoneError.textContent = "Phone must be 10 digits";
        phone.classList.add("input-error");
        isValid = false;
    }

    if (message.value.trim() === "") {
        messageError.textContent = "Message is required";
        message.classList.add("input-error");
        isValid = false;
    }

   if (!isValid) return;

    const payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        message: message.value.trim()
    };

    try {

        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";

       const clientDetails = getClientDetails();
        const ipData = await getIPAndCountry();

        const payload = {
            name: name.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            message: message.value.trim(),
            pageUrl: window.location.href,
            ip: ipData.ip,
            country: ipData.country,
            browser: clientDetails.browser,
            os: clientDetails.os,
            device: clientDetails.device
        };

        await saveEnquiryToSheet(payload);

        successMsg.textContent = "Message sent successfully!";
        successMsg.style.color = "green";

        name.value = "";
        email.value = "";
        phone.value = "";
        message.value = "";

        setTimeout(() => {
            document.getElementById("quickEnquiryModal").style.display = "none";
        }, 1500);

    } catch (error) {

        successMsg.textContent = error.message;
        successMsg.style.color = "red";

    } finally {

        sendBtn.disabled = false;
        sendBtn.textContent = "Send Message";
    }
};

}




async function saveEnquiryToSheet(payload) {

  const resp = await fetch("https://script.google.com/macros/s/AKfycbyi442eYkNw38MUFTwvgjW96Bt-EyyTDlbKVZTtlTa8pka7SGqmqYdbTfnvJ8SDED5k/exec", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });

  const text = await resp.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid server response");
  }

  if (!json.success) {
    throw new Error(json.error);
  }

  return json;
}

function getClientDetails() {

    const userAgent = navigator.userAgent;

    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";

    // Browser detection
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Edg")) browser = "Edge";

    // OS detection
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

    // Device detection
    if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) {
        device = "Mobile";
    }

    return { browser, os, device };
}


async function getIPAndCountry() {
    try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();

        return {
            ip: data.ip || "Unknown",
            country: data.country_name || "Unknown"
        };

    } catch (error) {
        return {
            ip: "Unknown",
            country: "Unknown"
        };
    }
}
