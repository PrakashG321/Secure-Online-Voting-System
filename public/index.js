function togglePasswordVisibility(inputId) {
  const passwordInput = document.getElementById(inputId);
  const togglePasswordIcon = passwordInput.nextElementSibling.querySelector('i');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    togglePasswordIcon.classList.remove('fa-eye');
    togglePasswordIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    togglePasswordIcon.classList.remove('fa-eye-slash');
    togglePasswordIcon.classList.add('fa-eye');
  }
}

function validateForm() {
  const isValidPhoneNumber = validatePhoneNumber();
  const isValidCitizenshipNumber = validateCitizenshipNumber();
  return isValidPhoneNumber && isValidCitizenshipNumber;
}

function validatePhoneNumber() {
  const input = document.getElementById("phone_no").value;
  const errorSpan = document.getElementById("phoneNoError");

  if (/^\d{10}$/.test(input)) {
    errorSpan.textContent = "";
    return true;
  } else {
    errorSpan.textContent = "Please enter exactly 10 digits";
    return false;
  }
}

function validateCitizenshipNumber() {
  const input = document.getElementById("citizenship_no").value;
  const errorSpan = document.getElementById("citizenshipNoError");

  if (input !== "") {
    errorSpan.textContent = "";
    return true;
  } else {
    errorSpan.textContent = "Citizenship number is required";
    return false;
  }
}

// Function to update the current date
function updateCurrentDate() {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  document.getElementById('currentDate').textContent = `Current Date: ${formattedDate}`;
}

window.onload = updateCurrentDate;

const endDateInput = document.getElementById('endDateInput').value;
const endDate = new Date(endDateInput);

function disableVoting() {
  const voteForm = document.getElementById('voteForm');
  if (voteForm) {
    voteForm.disabled = true;
  }
}

function updateTimer() {
  const now = new Date();
  const timeDifference = endDate - now;
  if (timeDifference > 0) {
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    document.querySelector('.timing').textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    const voteForm = document.getElementById('voteForm');
    if (voteForm) {
      voteForm.disabled = false;
    }
  } else {
    document.querySelector('.timing').textContent = 'Voting Closed';
    disableVoting();
  }
}

setInterval(updateTimer, 1000);
updateTimer();
