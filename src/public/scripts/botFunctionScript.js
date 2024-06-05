function setFormattedOpenedTime() {
    const OpenedTime = new Date();
    let Opendhours = OpenedTime.getHours();
    const Openedminutes = OpenedTime.getMinutes().toString().padStart(2, '0');
    const Openedseconds = OpenedTime.getSeconds().toString().padStart(2, '0');
    const Openedampm = Opendhours >= 12 ? 'PM' : 'AM';
    Opendhours = Opendhours % 12;
    Opendhours = Opendhours ? Opendhours : 12; // the hour '0' should be '12'
    const formattedOpenedTime = `${Opendhours.toString().padStart(2, '0')}:${Openedminutes} ${Openedampm}`;

    document.getElementById('OpenedTime2').textContent = formattedOpenedTime;
}

// Call the function to set the time
setFormattedOpenedTime();



// Define global variables
let chatHistory = [];
let messageDiv;
let chatWithAgent = false;
let chatTimeoutId;
let endChatAlertShown = false;

// Event listener to clear localStorage items on browser refresh
window.addEventListener("beforeunload", function (event) {
    localStorage.removeItem("selectedLanguage");
    localStorage.removeItem("chatId");
});

// Function to initialize typing animation
function showTypingAnimation() {
    const responseDiv = document.getElementById("response");
    const typingMessage = document.createElement("div");
    typingMessage.classList.add("bot-message");
    typingMessage.innerHTML = `
            <div class="typing-animation typingmsg-wrapper">
                <i class="bi bi-three-dots loading typing-msg"></i>
            </div>
            `;
    responseDiv.appendChild(typingMessage);
    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Function to remove typing animation
function hideTypingAnimation() {
    const typingMessage = document.querySelector(".typing-animation");
    if (typingMessage) {
        typingMessage.remove();
    }
}

// Function to handle error messages
function handleErrorMessage(error) {
    const responseDiv = document.getElementById("response");
    let errorMessage =
        "<p class='error-message'>The allocated number of tokens are over, please ask the administrator to add more tokens to the system.</p>"; // Default error message

    // Check if the error message matches the specific error condition
    if (
        error.message ===
        "The allocated number of tokens are over, please ask the administrator to add more tokens to the system."
    ) {
        errorMessage =
            "<p>The allocated number of tokens are over, please ask the administrator to add more tokens to the system.</p>";
    }
    responseDiv.innerHTML = errorMessage;
}

// Function to start chat timeout
function startChatTimeout() {
    chatTimeoutId = setTimeout(showEndChatAlert, 150000);
}

// Function to reset chat timeout
function resetChatTimeout() {
    clearTimeout(chatTimeoutId);
    startChatTimeout();
}

// Function to show end chat alert
function showEndChatAlert() {
    if (!endChatAlertShown) {
        // Check if the alert has not been shown
        endChatAlertShown = true; // Set the flag to true to indicate the alert has been shown

        const responseDiv = document.getElementById("response");
        const alertDiv = document.createElement("div");
        alertDiv.classList.add(
            "alert",
            "alert-warning",
            "alert-dismissible",
            "fade",
            "show"
        );
        alertDiv.setAttribute("role", "alert");
        alertDiv.innerHTML = `
            It seems you haven't sent a message for a while. Do you want to end the chat?
            <div class="d-flex flex-row">
              <button type="button" class="btnYesToClose btn-end-chat">Yes</button>
              <button type="button" class="btnNotoClose ms-2" data-bs-dismiss="alert">Cancel</button>
            </div>
        `;
        responseDiv.appendChild(alertDiv);
        alertDiv.scrollIntoView({ behavior: "smooth" });

        // Add event listener for the "Yes" button
        const endChatButton = alertDiv.querySelector(".btn-end-chat");
        endChatButton.addEventListener("click", handleEndChat);
    }
}

// Function to handle ending the chat
function handleEndChat() {
    // Clear the chat timeout
    clearTimeout(chatTimeoutId);

    // Show star rating form message
    appendMessageToResponse(
        "bot",
        "Please rate your chat experience:",
        null,
        true
    );
}

// Function to append message to response div
function appendMessageToResponse(role, content, data, isRatingForm = false) {
    const responseDiv = document.getElementById("response");
    const messageDiv = createMessageDiv(role, content);
    const image = createMessageImage(role);

    if (isList(content)) {
        appendListContent(messageDiv, content);
    } else if (content.includes("I'm sorry.. no information documents found for data retrieval.")) {
        appendLiveAgentContent(messageDiv, content, data);
    }
    // else if (!chatWithAgent && data && data.productOrService && !data.productOrService.includes("not a product")) {
    //     appendProductContent(messageDiv, content, data);
    // } 
    else {
        appendPlainTextContent(messageDiv, content);
    }

    if (isRatingForm) {
        appendRatingForm(messageDiv);
    }

    resetChatTimeout();

    messageDiv.prepend(image);
    responseDiv.appendChild(messageDiv);
    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// function createMessageDiv(role, content) {
//     const messageDiv = document.createElement("div");
//     messageDiv.classList.add(role === "user" ? "user-message" : "bot-message");
//     return messageDiv;
// }
function createMessageDiv(role, content) {
    const messageDiv = document.createElement("div");

    // Add class based on the role
    if (role === "user") {
        messageDiv.classList.add("user-message");
    } else if (role === "bot") {
        messageDiv.classList.add("bot-message");
    } else if (role === "product") {
        messageDiv.classList.add("product-message");
    }

    // Optionally, add the content to the messageDiv
    messageDiv.textContent = content;

    return messageDiv;
}


function createMessageImage(role) {
    const image = document.createElement("img");
    image.classList.add("message-image");
    image.src = role === "user" ? "/user.webp" : "/agent.png";
    return image;
}

function isList(content) {
    const listRegex = /^\d+\.\s.*$/gm;
    return listRegex.test(content);
}

function appendListContent(messageDiv, content) {

    const currentTime = new Date();
    let hours = currentTime.getHours();
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    const listItems = content.split("\n").map(item => `<li style="margin-bottom: 10px !important;">${item}</li>`).join("");
    messageDiv.innerHTML = `<div class="messageWrapper">
    <span class="botname-message">${formattedTime}</span>
    <div>
      <ul style="list-style: none; padding: 0px !important">${listItems}</ul>
    </div>
  </div>`;
}

function appendLiveAgentContent(messageDiv, content, data) {
    messageDiv.innerHTML = `
      <button id="LiveAgentButton" class="liveagentBtn">Chat with live agent</button>
      <div>${content}</div>`;
    const liveAgentButton = messageDiv.querySelector("#LiveAgentButton");
    liveAgentButton.addEventListener("click", handleLiveAgentButtonClick(data));
}

function handleLiveAgentButtonClick(data) {
    return async function () {
        try {
            const switchResponse = await fetch("/switch-to-live-agent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatId: data.chatId }),
            });
            console.log("switch : ", switchResponse)
            if (switchResponse.ok) {
                showAlert("One of our agents will join you soon. Please stay tuned.");
                startCheckingForAgent(data);
                // showOfflineForm();
            } else {
                // Show offline form
                showOfflineForm();
            }
        } catch (error) {
            console.error("Error switching to live agent:", error);
        }
    };
}

function showOfflineForm() {
    const responseDiv = document.getElementById("response");
    const offlineForm = document.createElement("div");
    offlineForm.innerHTML = `
        <div class="p-2">
            <div>Our agents are offline. Please submit your message:</div>
            <form id="offlineForm">
                <div class="mb-3">
                    <label for="name" class="form-label">Name</label>
                    <input type="text" class="form-control" id="name" required>
                </div>
                <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email" required>
                </div>
                <div class="mb-3">
                    <label for="subject" class="form-label">Subject</label>
                    <input type="text" class="form-control" id="subject" required>
                </div>
                <div class="mb-3">
                    <label for="message" class="form-label">Message</label>
                    <textarea class="form-control" id="message" rows="3" required></textarea>
                </div>
                <button type="submit" class="btnNotoClose">Submit</button>
            </form>
        </div>
    `;
    responseDiv.appendChild(offlineForm);

    // Scroll to the form
    offlineForm.scrollIntoView({ behavior: "smooth", block: "end" });

    // Add event listener for form submission
    const offlineFormElement = document.getElementById("offlineForm");
    offlineFormElement.addEventListener("submit", handleOfflineFormSubmission);
}


async function handleOfflineFormSubmission(event) {
    event.preventDefault();

    const chatId = localStorage.getItem("chatId");
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    try {
        const response = await fetch("/live-chat-offline-form", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ chatId, name, email, subject, message }),
        });

        if (response.ok) {
            showAlert("Your message has been submitted successfully. Our team will get back to you soon.");
        } else {
            showAlert("Failed to submit your message. Please try again later.");
        }
    } catch (error) {
        console.error("Error submitting offline form:", error);
        showAlert("An error occurred while submitting your message. Please try again later.");
    }
}


function startCheckingForAgent(data) {
    let intervalId;
    let agentJoined = false;

    intervalId = setInterval(async () => {
        try {
            const response = await fetch("/live-chat-agent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatId: data.chatId }),
            });

            if (response.ok) {
                const responseData = await response.json();
                if (responseData.agent_id !== "unassigned") {
                    if (!agentJoined) {
                        showAlert("Now you are chatting with agent ID: " + responseData.agent_name);
                        agentJoined = true;
                        chatWithAgent = true;
                    }
                    appendMessageToResponse("liveagent", responseData.agent_message, data);
                }
            }
        } catch (error) {
            console.error("Error fetching products data:", error);
        }
    }, 5000);

    setTimeout(() => {
        clearInterval(intervalId);
        if (!agentJoined) {
            showAlert("All agents are busy. Please try again later.");
            console.log("No agents available. API call stopped.");
        }
    }, 120000);
}

function appendProductContent(messageDiv, content, data) {
    messageDiv.innerHTML = `
      <button id="ProductButton" class="viewProductsBtn">View product & services</button>
      <div>${content}</div>`;
    const productButton = messageDiv.querySelector("#ProductButton");
    productButton.addEventListener("click", handleProductButtonClick(data));
}

function handleProductButtonClick(data) {
    return async function () {
        try {
            const response = await fetch("/chat-bot-get-intent-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ intent: "saving accounts" }),
            });
            const responseData = await response.json();
            console.log("product data : ", responseData.products);

            // Iterate over responseData.products and log the type of each item
            // responseData.products.forEach(item => {
            //     if (item.type == "textOnly") {
            //         console.log("text only :", item.node_data);
            //     }
            //     else if (item.type == "textinput") {
            //         console.log("text input:", item.node_data);
            //     }
            //     else if (item.type == "cardStyleOne") {
            //         console.log("text input:", item.node_data);
            //     }
            //     else if (item.type == "cardGroup") {
            //         console.log("text input:", item.node_data);
            //     }
            //     else{
            //         console.log("no data found");
            //     }
            // });


            const currentTime = new Date();
            let hours = currentTime.getHours();
            const minutes = currentTime.getMinutes().toString().padStart(2, '0');
            const seconds = currentTime.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

            const textOnlyItems = [];
            const textInputItems = [];
            const cardStyleOneItems = [];
            const cardGroupItems = [];
            responseData.products.forEach(item => {
                switch (item.type) {
                    case "textOnly":
                        textOnlyItems.push(item.node_data);
                        break;
                    case "textinput":
                        textInputItems.push(item.node_data);
                        break;
                    case "cardStyleOne":
                        cardStyleOneItems.push(item.node_data);
                        break;
                    case "cardGroup":
                        cardGroupItems.push(item.node_data);
                        break;
                    default:
                        console.log("no data found");
                }
            });

            // Generate HTML for each type of item
            const textOnlyHTML = textOnlyItems.map(item => `
            <p>text: ${item.text}<br>id: ${item.node_id}</p>
            `).join("");

            const textInputHTML = textInputItems.map(item => `<p>title: ${item.title || 'N/A'}<br>description: ${item.description || 'N/A'}<br>id: ${item.node_id}</p>`).join("");
            const cardStyleOneHTML = cardStyleOneItems.map(item => `
            <p>title: ${item.title || 'N/A'}<br>
            description: ${item.description || 'N/A'}<br>
            id: ${item.node_id} <br>
            image: ${item.image || 'N/A'} </p>

            <div class="product-card">
            <img src="" alt="" />
            </div>

            `).join("");

            // Add HTML generation for cardStyleOne and cardGroup if needed

            // Append HTML for each type of item to the messageDiv
            if (textOnlyHTML) {
                appendMessageToResponse("bot", `<p>Text Only Items:</p>${textOnlyHTML}`);
            }
            if (textInputHTML) {
                appendMessageToResponse("bot", `<p>Text Input Items:</p>${textInputHTML}`);
            }
            if (cardStyleOneHTML) {
                appendMessageToResponse("bot", `<p>Card Style One Items:</p>${cardStyleOneHTML}`);
            }




        } catch (error) {
            console.error("Error fetching products data:", error);
        }
    };
}

function appendPlainTextContent(messageDiv, content) {
    const currentTime = new Date();
    let hours = currentTime.getHours();
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    messageDiv.innerHTML = `<div class="messageWrapper">
        <span class="botname-message">${formattedTime}</span>
        <div>
          <p class="mb-0">${content}</p>
        </div>
      </div>`;
}

function appendRatingForm(messageDiv) {
    const ratingFormHTML = `
      <div class="star-rating-form d-flex flex-column" style="margin-bottom: 10px;">
        <label for="rating">Rate your experience:</label>
        <div class="rating-icons" style="border: none !important;">
          <i class="bi bi-star rating-icon"></i>
          <i class="bi bi-star rating-icon"></i>
          <i class="bi bi-star rating-icon"></i>
          <i class="bi bi-star rating-icon"></i>
          <i class="bi bi-star rating-icon"></i>
        </div>
        <input type="hidden" id="rating" name="rating" value="0">
        <textarea type="text" id="feedbackMessage" name="feedbackMessage" class="feedbackMessage"></textarea>
        <button id="submitRatingButton" class="btnNotoClose">Submit</button>
      </div>
    `;
    messageDiv.innerHTML += ratingFormHTML;
    addRatingIconEventListeners(messageDiv);
}

function addRatingIconEventListeners(messageDiv) {
    const ratingIcons = messageDiv.querySelectorAll(".rating-icon");
    ratingIcons.forEach((icon, index) => {
        icon.addEventListener("click", handleRatingIconClick(messageDiv, index));
    });
}

function handleRatingIconClick(messageDiv, index) {
    return function () {
        const ratingInput = messageDiv.querySelector("#rating");
        ratingInput.value = index + 1;
        const ratingIcons = messageDiv.querySelectorAll(".rating-icon");
        ratingIcons.forEach((star, i) => {
            star.classList.toggle("bi-star-fill", i <= index);
        });
    };
}

function showAlert(message) {
    const responseDiv = document.getElementById("response");
    const alertDiv = document.createElement("div");
    alertDiv.classList.add("alert", "alert-warning", "alert-dismissible", "fade", "show", "me-2");
    alertDiv.setAttribute("role", "alert");
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    responseDiv.appendChild(alertDiv);
    alertDiv.scrollIntoView({ behavior: "smooth" });
}



function appendLanguageMessage(content) {
    const responseDiv = document.getElementById("response");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("bot-message");

    // Create an image element for the message
    const image = document.createElement("img");
    image.classList.add("message-image");
    image.src = "/agent.png";

    const currentTime = new Date();
    let hours = currentTime.getHours();
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    // Use innerHTML to allow HTML formatting in the message
    messageDiv.innerHTML = `<div class="messageWrapper">
    <span class="botname-message">${formattedTime}</span>
    <div>
      <p class="mb-0">${content}</p>
    </div>
  </div>`;
    messageDiv.prepend(image);

    responseDiv.appendChild(messageDiv);
    // Scroll down to the latest message
    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Event listener for question form submission
document
    .getElementById("questionForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();
        const questionInput = document.getElementById("question");
        const question = questionInput.value;

        document.getElementById("question").value = "";

        const selectedLanguage = localStorage.getItem("selectedLanguage");
        // Add the user's question to the chat history
        chatHistory.push({ role: "user", content: question });

        appendMessageToResponse("user", question);

        let chatId = localStorage.getItem("chatId");
        console.log("generated chat id : ", chatId);
        const requestBody = {
            chatId: chatId,
            messages: chatHistory,
            language: selectedLanguage || "English",
        };
        const requestBodyAgent = {
            chatId: chatId,
            user_message: question,
            language: selectedLanguage || "English",
        };

        console.log("requestBody : ", requestBody);

        if (chatWithAgent === false) {
            // Display the user's message immediately
            // Change button icon to three dots
            const submitButton = document.querySelector(".chat-submit-button");
            submitButton.innerHTML = '<i class="bi bi-three-dots loading"></i>';
            submitButton.disabled = true;

            // Disable input field
            questionInput.disabled = true;
            // Show typing animation
            showTypingAnimation();


            const currentTime = new Date();
            let hours = currentTime.getHours();
            const minutes = currentTime.getMinutes().toString().padStart(2, '0');
            const seconds = currentTime.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;


            try {
                const response = await fetch("/api/chat-response-flow", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                const data = await response.json();

                // Update the chat history for future interactions
                chatHistory = data.chatHistory || [];
                console.log("chatId : ", data.chatId);

                if (!localStorage.getItem("chatId")) {
                    localStorage.setItem("chatId", data.chatId);
                }

                if (data.productOrService !== null) {
                    console.log("intent data : ", data.productOrService);
                    const items = data.productOrService;


                    const generateHTMLForItem = (item, index) => {
                        switch (item.type) {
                            case 'buttonGroup':
                                const buttonsHTML = item.node_data.map(buttonItem => {
                                    if (buttonItem.button.link) {
                                        return `<div class="linkWrapper">
                                            <a href="${buttonItem.button.link}" target="__blank" class="linkItem mb-2">${buttonItem.button.text}</a>
                                        </div>`;
                                    } else {
                                        return `<button id="${buttonItem.button.node_id}" class="buttonItem mb-2">${buttonItem.button.text}</button>`;
                                    }
                                }).join('');

                                return `
                                    <div class="buttonGroup p-0" style="box-shadow: none !important">
                                        ${buttonsHTML}
                                    </div>`;
                            case 'textinput':
                                return `
                                    <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                            <p class="px-2">${item.node_data.title}</p>
                                            <p class="px-2">${item.node_data.description}</p>
                                        </div>
                                    </div>`;

                            // case 'cardGroup':
                            //     const buttonsMainCardHTML = item.node_data.map(buttonItem =>
                            //         {
                            //             if (buttonItem.button.link) {
                            //                 return `<div class="linkWrapper">
                            //                 <a href="${buttonItem.button.link}" target="__blank" class="linkItem mb-2">${buttonItem.button.text}</a>
                            //             </div>`;
                            //             } else {
                            //                 return `<button id="${buttonItem.button.node_id}" class="buttonItem mb-2">${buttonItem.button.text}</button>`;
                            //             }
                            //         }).join('');
                            //     return `
                            //         <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                            //             <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                            //                 <img src="../images/bg-1.jpg" alt="" class="cardImage">
                            //                 <div class="cardGroup px-2" style="box-shadow: none !important">
                            //                     <h4 class="px-2 mt-2">${item.node_data[0].card.title}</h4>
                            //                     <p class="px-2">${item.node_data[0].card.description}</p>
                            //                     <div class="buttonGroup p-0" style="box-shadow: none !important">
                            //                     ${buttonsMainCardHTML}
                            //                     </div>
                            //                 </div>
                            //             </div>
                            //         </div>`;

                            case 'cardGroup':
                                const buttonsMainCardHTML = item.node_data.map(buttonItem => {
                                    if (buttonItem.button && buttonItem.button.link) {
                                        return `<div class="linkWrapper">
                                                    <a href="${buttonItem.button.link}" target="__blank" class="linkItem mb-2">${buttonItem.button.text}</a>
                                                </div>`;
                                    } else if (buttonItem.button) {
                                        return `<button id="${buttonItem.button.node_id}" class="buttonItem mb-2">${buttonItem.button.text}</button>`;
                                    }
                                    return '';
                                }).join('');
                                return `
                                        <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                            <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                                <img src="../images/bg-1.jpg" alt="" class="cardImage">
                                                <div class="cardGroup px-2" style="box-shadow: none !important">
                                                    <h4 class="px-2 mt-2">${item.node_data[0].card.title}</h4>
                                                    <p class="px-2">${item.node_data[0].card.description}</p>
                                                    <div class="buttonGroup p-0" style="box-shadow: none !important">
                                                        ${buttonsMainCardHTML}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`;
                            case 'textOnly':
                                if (item.node_data.text.includes('●')) {
                                    const bulletPoints = item.node_data.text.split('●').filter(point => point.trim() !== '');
                                    const bulletPointsHTML = bulletPoints.map(point => `<li class="mb-2">${point.trim()}</li>`).join('');
                                    return `
                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                            <ul class="px-3 py-2">${bulletPointsHTML}</ul>
                                        </div>`;
                                } else {
                                    return `
                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                            <p class="px-2">${item.node_data.text}</p>
                                        </div>`;
                                };

                            case 'cardStyleOne':
                                return `
                                <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                    <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                        <img src="../images/bg-1.jpg" alt="" class="cardImage">
                                        <div class="cardGroup px-2" style="box-shadow: none !important">
                                            <h4 class="px-2 mt-2">${item.node_data[0].card.title}</h4>
                                            <p class="px-2">${item.node_data[0].card.description}</p>
                                        </div>
                                    </div>
                                </div>`;
                            default:
                                return '';

                        }
                    }





                    async function sendNodeId(nodeId) {
                        const response = await fetch("https://dfcc-chat-bot.vercel.app/chat-bot-get-target-data", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ source: nodeId }),
                        });

                        const data = await response.json();
                        console.log("node data === ", data)

                        const generateHTMLForData = (items) => {
                            return items.map((item, index) => {
                                switch (item.type) {
                                    case 'cardGroup':
                                        // console.log("type : ", item.source_data)
                                        const buttonsCardHTML = item.source_data.slice(1).map(buttonItem => {
                                            if (buttonItem.button.link) {
                                                return `
                                                <div class="linkWrapper">
                                                    <a href="${buttonItem.button.link}" target="__blank" class="linkItem mb-2">${buttonItem.button.text}</a>
                                                </div>`;
                                            } else {
                                                return `<button id="${buttonItem.button.node_id}" class="buttonItem mb-2">${buttonItem.button.text}</button>`;
                                            }
                                        }).join('');

                                        // ${item.source_data.slice(1).map(buttonItem => `<button id="${buttonItem.button.node_id}" class="mb-2">${buttonItem.button.text}</button>`).join('')}
                                        return `
                                        <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                            <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                                <img src="../images/bg-1.jpg" alt="" class="cardImage">
                                                <div class="cardGroup px-2" style="box-shadow: none !important">
                                                    <h4 class="px-2 mt-2">${item.source_data[0].card.title}</h4>
                                                    <p class="px-2">${item.source_data[0].card.description}</p>
                                                    <div class="buttonGroup p-0" style="box-shadow: none !important">
                                                    ${buttonsCardHTML}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`;
                                    case 'buttonGroup':
                                        const buttonsGroupHTML = item.source_data.slice(0).map(buttonItem => {
                                            if (buttonItem.button.link) {
                                                return `
                                                <div class="linkWrapper">
                                                    <a href="${buttonItem.button.link}" target="__blank" class="linkItem mb-2">${buttonItem.button.text}</a>
                                                </div>`;
                                            } else {
                                                return `<button id="${buttonItem.button.node_id}" class="buttonItem mb-2">${buttonItem.button.text}</button>`;
                                            }
                                        }).join('');

                                        return `
                                            <div class="buttonGroup p-0" style="box-shadow: none !important">
                                                ${buttonsGroupHTML}
                                            </div>`;
                                    case 'textOnly':
                                        return `
                                        <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                            <p class="px-2">${item.source_data.title}</p>
                                            <p class="px-2">${item.source_data.description}</p>
                                        </div>
                                    </div>`;
                                    case 'textinput':
                                        return `
                                        <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                            <p class="px-2">${item.source_data.title}</p>
                                            <p class="px-2">${item.source_data.description}</p>
                                        </div>
                                    </div>`;
                                    case 'cardStyleOne':
                                        return `
                                                    <div class="carousel-item p-0 ${index === 0 ? 'active' : ''}" style="box-shadow: none !important">
                                                        <div class="slideInnerConteiner p-0" style="box-shadow: none !important">
                                                            <img src="../images/bg-1.jpg" alt="" class="cardImage">
                                                            <div class="cardGroup px-2" style="box-shadow: none !important">
                                                                <h4 class="px-2 mt-2">${item.source_data[0].card.title}</h4>
                                                                <p class="px-2">${item.source_data[0].card.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>`;
                                    default:
                                        return '';
                                }
                            }).join("");
                        }

                        const carouselDataHTML = generateHTMLForData(data.sourceData);

                        if (data.sourceData.length > 1) {
                            const uniqueCarouselId = `carousel-${Date.now()}`;
                            appendMessageToResponse("product", `
                                <div id="${uniqueCarouselId}" class="carousel slide bsSlider p-0" data-bs-ride="carousel">
                                    <div class="carousel-inner p-0">
                                    ${carouselDataHTML}
                                    </div>
                                    <button class="carousel-control-prev" type="button" data-bs-target="#${uniqueCarouselId}" data-bs-slide="prev">
                                        <i class="bi bi-caret-left-fill text-danger"></i>
                                        <span class="visually-hidden">Previous</span>
                                    </button>
                                    <button class="carousel-control-next" type="button" data-bs-target="#${uniqueCarouselId}" data-bs-slide="next">
                                        <i class="bi bi-caret-right-fill text-danger"></i>
                                        <span class="visually-hidden">Next</span>
                                    </button>
                                </div>
                            `);
                        } else if (data.sourceData.length === 1) {
                            appendMessageToResponse("product", `
                                <div>
                                    ${carouselDataHTML}
                                </div>
                            `);
                        }
                    }


                    document.addEventListener('click', event => {
                        const button = event.target.closest('.buttonItem');
                        if (button) {
                            const nodeId = button.id;
                            sendNodeId(nodeId);
                        }
                    });
                    const carouselItemsHTML = items.map((item, index) => generateHTMLForItem(item, index)).join("");


                    if (items.length > 1) {
                        // Append the generated HTML to the response as a carousel if there is more than one item
                        appendMessageToResponse("product", `
                            <div id="carouselExampleControls" class="carousel slide bsSlider p-0" data-bs-ride="carousel">
                                <div class="carousel-inner p-0">
                                ${carouselItemsHTML}
                                </div>
                                <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="prev">
                                    <i class="bi bi-caret-left-fill text-danger"></i>
                                    <span class="visually-hidden">Previous</span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleControls" data-bs-slide="next">
                                    <i class="bi bi-caret-right-fill text-danger"></i>
                                    <span class="visually-hidden">Next</span>
                                </button>
                            </div>
                        `);
                    } else if (items.length === 1) {
                        // Append the generated HTML to the response without the carousel if there is only one item
                        appendMessageToResponse("product", `
                            <div>
                                ${carouselItemsHTML}
                            </div>
                        `);
                    }

                } else {
                    console.log("if not a product")
                }

                if (data.answer !== null) {
                    appendMessageToResponse("bot", data.answer, data);
                }

                // Hide typing animation
                hideTypingAnimation();
                // Clear the question input
                questionInput.value = "";
                submitButton.innerHTML = '<i class="bi bi-send"></i>';
                submitButton.disabled = false;
            } catch (error) {
                console.error("Error submitting question:", error);
                // Handle specific error message
                handleErrorMessage(error);
            } finally {
                // Enable input field
                questionInput.disabled = false;
            }
        } else {
            const responseLiveAgent = await fetch("/live-chat-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBodyAgent),
            });

            const liveAgentData = await responseLiveAgent.json();
            chatHistory = liveAgentData.chatHistory || []; // Update chat history

            // Append the response to the response div

            checkForAgent();
            // Hide typing animation
            // hideTypingAnimation();

            // Clear the question input
            questionInput.value = "";

            // Change button icon back to send icon
            // submitButton.innerHTML = '<i class="bi bi-send"></i>';

            // Enable the submit button
            // submitButton.disabled = false;
        }
    });








// Event listener for language change to English
document
    .getElementById("changeToEnglishButton")
    .addEventListener("click", function () {
        localStorage.setItem("selectedLanguage", "English");
        appendLanguageMessage("Please ask your question in English.");
    });

// Event listener for language change to Sinhala
document
    .getElementById("changeToSinhalaButton")
    .addEventListener("click", function () {
        localStorage.setItem("selectedLanguage", "Sinhala");
        appendLanguageMessage("කරුණාකර ඔබේ ප්‍රශ්නය සිංහලෙන් අසන්න.");
    });

// Event listener for language change to Tamil
document
    .getElementById("changeToTamilButton")
    .addEventListener("click", function () {
        localStorage.setItem("selectedLanguage", "Tamil");
        appendLanguageMessage("உங்கள் கேள்வியை தமிழில் கேளுங்கள்.");
    });

// Function to handle rating submission
async function handleRatingSubmission() {
    const ratingInput = document.getElementById("rating");
    const rating = ratingInput.value;
    const feedbackMessageInput = document.getElementById("feedbackMessage");
    const feedbackMessage = feedbackMessageInput.value;
    const chatId = localStorage.getItem("chatId");

    try {
        const response = await fetch("/save-rating", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ratingValue: rating,
                feedbackMessage: feedbackMessage,
                chatId: chatId,
            }),
        });

        if (response.ok) {
            // Show thank you message for feedback
            const responseDiv = document.getElementById("response");
            const thankYouDiv = document.createElement("div");
            thankYouDiv.classList.add(
                "alert",
                "alert-success",
                "alert-dismissible",
                "fade",
                "show"
            );
            thankYouDiv.setAttribute("role", "alert");
            thankYouDiv.textContent = "Thank you for your feedback!";
            responseDiv.appendChild(thankYouDiv);
            thankYouDiv.scrollIntoView({ behavior: "smooth" });
        }
    } catch (error) {
        console.error("Error submitting rating:", error);
        // Handle error
    }
}

// Add event listeners for the rating icons
function addRatingIconEventListeners(messageDiv) {
    const ratingIcons = messageDiv.querySelectorAll(".rating-icon");
    ratingIcons.forEach((icon, index) => {
        icon.addEventListener("click", () => {
            // Set the rating value based on the index of the clicked star icon
            const ratingInput = document.getElementById("rating");
            ratingInput.value = index + 1;

            // Highlight the selected star and unhighlight the rest
            ratingIcons.forEach((star, i) => {
                if (i <= index) {
                    star.classList.add("bi-star-fill");
                    star.classList.remove("bi-star");
                } else {
                    star.classList.remove("bi-star-fill");
                    star.classList.add("bi-star");
                }
            });
        });
    });
}

// Call the function with messageDiv when it's available
addRatingIconEventListeners(messageDiv);

