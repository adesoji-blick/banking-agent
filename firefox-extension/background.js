browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'openai_query') {
    try {
      const apiKey = message.apiKey;
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(message.body)
      });
      const data = await res.json();
      return Promise.resolve({ success: true, data });
    } catch (err) {
      return Promise.resolve({ success: false, error: err.message });
    }
  }
}); 