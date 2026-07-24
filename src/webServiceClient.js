async function callWebService(url) {
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Web service returned ${response.status} ${response.statusText}`);
  }

  return response;
}

module.exports = {
  callWebService
};
