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
  var isValidPhoneNumber = validatePhoneNumber();
  return isValidPhoneNumber; // Return the result of phone number validation
}

function validatePhoneNumber() {
  var input = document.getElementById("phone_no").value;
  var errorSpan = document.getElementById("phoneNoError");

  if (/^\d{10}$/.test(input)) {
      errorSpan.textContent = ""; // Clear error message if input is valid
      return true; // Validation successful
  } else {
      errorSpan.textContent = "Please enter exactly 10 digits"; // Show error message
      return false; // Validation failed
  }
}


// Function to update the current date


function updateCurrentDate() {
  // Create a new Date object
  var currentDate = new Date();

  // Get the date, month, and year
  var day = currentDate.getDate();
  var month = currentDate.getMonth() + 1; // Months are zero-indexed, so we add 1
  var year = currentDate.getFullYear();

  // Format the date as desired (e.g., DD/MM/YYYY)
  var formattedDate = day + '/' + month + '/' + year;

  // Update the content of the element with ID 'currentDate'
  document.getElementById('currentDate').textContent = 'Current Date: ' + formattedDate;
}

// Call the function to update the current date when the page loads
window.onload = function() {
  updateCurrentDate();
};

   // Set the end date for the voting period
   var endDate = new Date('2024-03-23T12:00:00'); // Example end date and time

   // Function to update the timer
   function updateTimer() {
    var now = new Date();
    var timeDifference = endDate - now;

    console.log("Now:", now);
    console.log("End Date:", endDate);
    console.log("Time Difference (milliseconds):", timeDifference);

    if (timeDifference > 0) {
        var hours = Math.floor(timeDifference / (1000 * 60 * 60));
        var minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        document.querySelector('.timing').textContent = hours + ":" + minutes + ":" + seconds;
    } else {
        document.querySelector('.timing').textContent = "Voting Closed";
    }
}

   // Update timer every second
   setInterval(updateTimer, 1000);

   // Initial call to update timer
   updateTimer();