// TODO the frontend should not have to directly communicate with the backend servers for this,
// it should just put stuff into database -> it's backend's job to look for new tasks to run

const handler = async (req, res) => {
    const { id } = req.query;
    const { key } = req.body;
    console.log("Key from request body is", key);

    try {
        let response = await fetch('http://localhost:5050/experiment', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
            }),
            // credentials: 
            body: JSON.stringify({ experiment: { id, key } }),
        })
        res.status(200).json({ response: response })
    } catch (error) {
        console.log("Error uploading experiment to server: ", error)
        res.status(500).json({ response: "Upload to backend error" })
    }
};

export default handler;
