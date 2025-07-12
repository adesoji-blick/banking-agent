(function () {
  // --- UI ---
  const bubble = document.createElement('div');
  bubble.innerText = '🏦';
  bubble.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#00524f;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9999;font-size:28px;font-weight:bold;user-select:none;';
  document.body.appendChild(bubble);

  const chatbox = document.createElement('div');
  chatbox.style.cssText = 'position:fixed;bottom:90px;right:20px;width:350px;height:300px;background:white;border:1px solid #ccc;box-shadow:0 0 20px rgba(0,0,0,0.3);border-radius:8px;z-index:9999;display:none;flex-direction:column;';
  document.body.appendChild(chatbox);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'How can I help you today?';
  input.style.cssText = 'border:none;border-top:1px solid #ccc;padding:10px;width:100%;box-sizing:border-box;font-size:14px;';
  chatbox.appendChild(input);

  const messages = document.createElement('div');
  messages.style.cssText = 'flex:1;overflow:auto;padding:10px;font-size:14px;line-height:1.4;';
  chatbox.insertBefore(messages, input);

  // --- Draggable Bubble ---
  let offsetX, offsetY, isDragging = false;

  bubble.addEventListener('mousedown', function (e) {
    isDragging = true;
    const rect = bubble.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    const left = e.clientX - offsetX;
    const top = e.clientY - offsetY;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
    chatbox.style.left = left + 'px';
    chatbox.style.top = (top - chatbox.offsetHeight - 10) + 'px';
    chatbox.style.right = 'auto';
    chatbox.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', function () {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  bubble.ondragstart = () => false;

  // --- Bubble Click: Toggle Chatbox ---
  bubble.onclick = () => {
    if (isDragging) return;
    if (chatbox.style.display === 'none') {
      chatbox.style.display = 'flex';
      const rect = bubble.getBoundingClientRect();
      chatbox.style.left = rect.left + 'px';
      chatbox.style.top = (rect.top - chatbox.offsetHeight - 10) + 'px';
      chatbox.style.right = 'auto';
      chatbox.style.bottom = 'auto';
      input.focus();
    } else {
      chatbox.style.display = 'none';
    }
  };

  // --- Personalized Greeting ---
  function extractUserName() {
    const nameEl = Array.from(document.querySelectorAll('span, div, h1, h2, h3')).find(el => /Welcome,\s*([\w\- ]+)/.test(el.textContent));
    if (nameEl) {
      const match = nameEl.textContent.match(/Welcome,\s*([\w\- ]+)/);
      if (match) return match[1].trim();
    }
    return null;
  }

  // --- DOM Summarization for LLM ---
  function summarizeDOM() {
    let summary = '';

    // Extract user name from welcome message
    const userName = extractUserName();
    if (userName) summary += `User name: ${userName} | `;

    // Main account balance
    const balanceEl = document.querySelector('#MainContent_TransactionMainContent_Container2_lblBalanceValue');
    if (balanceEl) summary += `Main account balance: ${balanceEl.textContent.trim()} | `;

    // Financial overview (robust extraction)
    let overviewValue = null;
    const overviewLabel = Array.from(document.querySelectorAll('h2, h3, div')).find(el => el.textContent.includes('Financial Overview'));
    if (overviewLabel) {
      // Look for the next element with a currency value
      let el = overviewLabel;
      while (el && !overviewValue) {
        el = el.nextElementSibling;
        if (el && /\$[\d,.]+/.test(el.textContent)) {
          overviewValue = el.textContent.trim();
        }
      }
      // Fallback: search children
      if (!overviewValue && overviewLabel.parentElement) {
        const child = Array.from(overviewLabel.parentElement.querySelectorAll('span, div, h1, h2, h3')).find(e => /\$[\d,.]+/.test(e.textContent));
        if (child) overviewValue = child.textContent.trim();
      }
      if (overviewValue) summary += `Financial overview: ${overviewValue} | `;
    }

    // Assets
    const assetsLabel = Array.from(document.querySelectorAll('div, span')).find(el => el.textContent.includes('Assets'));
    if (assetsLabel) {
      let valueEl = assetsLabel.nextElementSibling;
      if (!valueEl || !/\$[\d,.]+/.test(valueEl.textContent)) {
        valueEl = Array.from(assetsLabel.parentElement.querySelectorAll('span, div')).find(el => /\$[\d,.]+/.test(el.textContent));
      }
      if (valueEl) summary += `Assets: ${valueEl.textContent.trim()} | `;
    }

    // Liabilities
    const liabilitiesLabel = Array.from(document.querySelectorAll('div, span')).find(el => el.textContent.includes('Liabilities'));
    if (liabilitiesLabel) {
      let valueEl = liabilitiesLabel.nextElementSibling;
      if (!valueEl || !/\$[\d,.]+/.test(valueEl.textContent)) {
        valueEl = Array.from(liabilitiesLabel.parentElement.querySelectorAll('span, div')).find(el => /\$[\d,.]+/.test(el.textContent));
      }
      if (valueEl) summary += `Liabilities: ${valueEl.textContent.trim()} | `;
    }

    // Fallback: also include the main visible text, but limit length
    summary += Array.from(document.querySelectorAll('body *'))
      .filter(el => el.offsetParent !== null && el.textContent.trim().length > 0)
      .map(el => el.textContent.trim())
      .join(' | ')
      .slice(0, 1000); // Limit to 1k chars

    return summary;
  }

  // --- OpenAI API Call ---
  async function askOpenAI(userQuestion, domSummary) {
    const apiKey = localStorage.getItem('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OpenAI API key not set. Please set it with localStorage.setItem("OPENAI_API_KEY", "sk-...") in the console.');
    const systemPrompt = `You are a helpful banking assistant. The user is viewing their online banking dashboard.\nYou will be given a summary of the visible page and a user question.\nExtract the answer from the summary, or say if it's not present.\nIf the user asks for their balance, look for the most likely balance value.\nIf they ask for transactions, list the most recent ones.\nIf they ask for contacts, list the names and details.\nBe concise and accurate.`;
    const body = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `PAGE SUMMARY:\n${domSummary}\n\nQUESTION: ${userQuestion}` }
      ],
      temperature: 0.2,
      max_tokens: 300
    };
    const response = await browser.runtime.sendMessage({
      type: 'openai_query',
      apiKey,
      body
    });
    if (!response.success) throw new Error(response.error);
    // Robust error handling for OpenAI API response
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      if (response.data && response.data.error && response.data.error.message) {
        throw new Error("OpenAI error: " + response.data.error.message);
      }
      throw new Error("OpenAI API returned an unexpected response.");
    }
    return response.data.choices[0].message.content.trim();
  }

  // --- Local DOM Extraction Helpers ---
  function getMainBalanceFromDOM() {
    const el = document.querySelector('#MainContent_TransactionMainContent_Container2_lblBalanceValue');
    return el ? el.textContent.trim() : null;
  }

  function getFinancialOverviewFromDOM() {
    const el = document.querySelector('#MainContent_TransactionMainContent_Container3_rptProducts_totalAmount_0');
    return el ? el.textContent.trim() : null;
  }

  function getUserNameFromDOM() {
    const el = document.querySelector('.profile-name');
    return el ? el.textContent.trim() : null;
  }

  function getUnreadMessagesFromDOM() {
    const el = document.querySelector('#MainContent_TransactionMainContent_Container1_FlowContainerDetail1_lblMessagesNumber');
    return el ? el.textContent.trim() : null;
  }

  function getEtransferHistoryFromDOM(limit = 5) {
    const rows = Array.from(document.querySelectorAll('tr.item'));
    return rows.slice(0, limit).map(row => {
      const tds = row.querySelectorAll('td');
      return {
        date: tds[1]?.textContent.trim(),
        type: tds[2]?.textContent.trim(),
        contact: tds[3]?.textContent.trim().replace(/\n+/g, ' '),
        amount: tds[4]?.textContent.trim(),
        status: tds[5]?.textContent.trim()
      };
    });
  }

  // --- LLM Toggle ---
  let useLLM = false; // Set to true to enable LLM fallback, false to use only local logic

  // --- Set Personalized Greeting on Widget Load ---
  const userName = getUserNameFromDOM();
  if (userName) {
    messages.innerHTML = `<div><strong>Agent:</strong> Hello ${userName}! How can I help you today?</div>`;
    input.placeholder = `How can I help you today, ${userName}?`;
  } else {
    messages.innerHTML = '<div><strong>Agent:</strong> Hello! How can I help you today?</div>';
    input.placeholder = 'How can I help you today?';
  }

  // --- Hybrid Input Handler ---
  input.addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      messages.innerHTML += `<div><strong>You:</strong> ${val}</div>`;
      input.value = '';
      try {
        const lower = val.toLowerCase();
        // Local logic for balance
        if (lower.includes('balance')) {
          const balance = getMainBalanceFromDOM();
          if (balance) {
            messages.innerHTML += `<div><strong>Agent:</strong> The main account balance is ${balance}.</div>`;
            return;
          }
        }
        // Local logic for financial overview
        if (lower.includes('financial overview')) {
          const overview = getFinancialOverviewFromDOM();
          if (overview) {
            messages.innerHTML += `<div><strong>Agent:</strong> Your financial overview is ${overview}.</div>`;
            return;
          }
        }
        // Local logic for name
        if (lower.includes('name')) {
          const name = getUserNameFromDOM();
          if (name) {
            messages.innerHTML += `<div><strong>Agent:</strong> Your name is ${name}.</div>`;
            return;
          }
        }
        // Local logic for unread messages
        if (lower.includes('unread message')) {
          const unread = getUnreadMessagesFromDOM();
          if (unread) {
            messages.innerHTML += `<div><strong>Agent:</strong> You have ${unread} unread message${unread === '1' ? '' : 's'}.</div>`;
            return;
          }
        }
        // Local logic for e-transfer/transaction history
        if (lower.includes('e-transfer') || lower.includes('etransfer') || lower.includes('transfer history') || lower.includes('recent transactions')) {
          const history = getEtransferHistoryFromDOM();
          if (history.length) {
            const formatted = history.map(tx =>
              `${tx.date}: ${tx.type}, ${tx.contact}, ${tx.amount}, ${tx.status}`
            ).join('<br>');
            messages.innerHTML += `<div><strong>Agent:</strong> Recent e-Transfers:<br>${formatted}</div>`;
            return;
          }
        }
        // Fallback: use LLM only if enabled
        if (useLLM) {
          const domSummary = summarizeDOM();
          const answer = await askOpenAI(val, domSummary);
          messages.innerHTML += `<div><strong>Agent:</strong> ${answer}</div>`;
        } else {
          messages.innerHTML += `<div><strong>Agent:</strong> (LLM is disabled for testing. No local answer found.)</div>`;
        }
      } catch (err) {
        // Show API key message only if LLM is attempted and key is missing
        if (err.message && err.message.includes('OpenAI API key not set')) {
          messages.innerHTML += `<div><strong>Agent:</strong> Please set your OpenAI API key with <code>localStorage.setItem('OPENAI_API_KEY', 'sk-...')</code> in the console before asking LLM questions.</div>`;
        } else {
          messages.innerHTML += `<div><strong>Agent:</strong> Error: ${err.message}</div>`;
        }
      }
    }
  });
})(); 