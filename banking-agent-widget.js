
/*
  Smart Banking Agent (Injected Widget)
  Version: MVP-1
  Description: Injects a chat bubble and sidebar UI that connects to OpenAI and interacts with DOM elements
*/

(function () {
  // ---- Configuration ----
  const OPENAI_API_KEY = window.OPENAI_API_KEY || "<OPENAI_API_KEY>";
  const MODEL = "gpt-4"; // or "gpt-3.5-turbo" if needed
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

  // ---- UI Elements ----
  const bubble = document.createElement("div");
  bubble.id = "ai-agent-bubble";
  bubble.style.cssText = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#00524f;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9999;font-size:28px;font-weight:bold;";
  bubble.innerText = "💬";

  const chatbox = document.createElement("div");
  chatbox.id = "ai-agent-chatbox";
  chatbox.style.cssText = "position:fixed;bottom:90px;right:20px;width:300px;height:250px;background:white;border:1px solid #ccc;box-shadow:0 0 10px rgba(0,0,0,0.3);border-radius:8px;z-index:9999;display:none;flex-direction:column;";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask me to do something...";
  input.style.cssText = "border:none;border-top:1px solid #ccc;padding:8px;width:100%;box-sizing:border-box;";

  const messages = document.createElement("div");
  messages.style.cssText = "flex:1;overflow:auto;padding:8px;font-size:14px;";

  chatbox.appendChild(messages);
  chatbox.appendChild(input);

  const sidebar = document.createElement("div");
  sidebar.id = "ai-agent-sidebar";
  sidebar.style.cssText = "position:fixed;top:60px;right:0;width:0;background:white;height:80%;overflow:auto;box-shadow:-2px 0 5px rgba(0,0,0,0.1);transition:width 0.3s ease;z-index:9998;border-left:1px solid #ccc;";

  const toggleSidebar = (expand) => {
    sidebar.style.width = expand ? "300px" : "0";
  };

  document.body.appendChild(bubble);
  bubble.style.cssText = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#00524f;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9999;font-size:28px;font-weight:bold;user-select:none;";

  bubble.onmousedown = function (e) {
    e.preventDefault();
    let shiftX = e.clientX - bubble.getBoundingClientRect().left;
    let shiftY = e.clientY - bubble.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      bubble.style.left = pageX - shiftX + "px";
      bubble.style.top = pageY - shiftY + "px";
      bubble.style.right = "auto";
      bubble.style.bottom = "auto";
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener("mousemove", onMouseMove);

    bubble.onmouseup = function () {
      document.removeEventListener("mousemove", onMouseMove);
      bubble.onmouseup = null;
    };
  };

  bubble.ondragstart = () => false;

  document.body.appendChild(chatbox);
  document.body.appendChild(sidebar);

  bubble.onclick = () => {
    chatbox.style.display = chatbox.style.display === "none" ? "flex" : "none";
  };

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const userInput = input.value.trim();
      messages.innerHTML += `<div><strong>You:</strong> ${userInput}</div>`;
      input.value = "";

      const response = await queryLLM(userInput);
      messages.innerHTML += `<div><strong>Agent:</strong> ${response}</div>`;

      // Simple sidebar test
      if (response.includes("transactions")) {
        toggleSidebar(true);
        sidebar.innerHTML = `<div style='padding:1rem;'><strong>Sample Transactions:</strong><ul><li>July 11 - $4.38 - Giles</li><li>July 10 - -$100 - Transfer</li></ul></div>`;
      }
    }
  });

  async function queryLLM(userText) {
    try {
      const body = {
        model: MODEL,
        messages: [{ role: "user", content: userText }],
        temperature: 0.3,
      };

      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      console.error("OpenAI error:", err);
      return "There was an error processing your request.";
    }
  }
})();
