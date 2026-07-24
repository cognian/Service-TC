export async function callWebService(url: string): Promise<Response> {
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Web service returned ${response.status} ${response.statusText}`);
  }

  return response;
}
