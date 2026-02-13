// Load HTML and initialize
document.addEventListener("DOMContentLoaded", function () {

    fetch("QuickEnquiry.html")
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

  sendBtn.onclick = function () {

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

    // Success
    successMsg.textContent = "Message sent successfully!";
    successMsg.style.color = "green";

    name.value = "";
    email.value = "";
    phone.value = "";
    message.value = "";

    setTimeout(() => {
        document.getElementById("quickEnquiryModal").style.display = "none";
    }, 1500);
};

}
