export async function llamarAPI(action, path, extraData = {}) {
    const res = await fetch('/api/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path, ...extraData })
    });
    return await res.json();
}
