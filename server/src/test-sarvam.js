import 'dotenv/config'

async function test() {
    console.log("Testing translate...");
    try {
        const sarvamResponse = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: 'Hello world! How are you doing today?',
                source_language_code: 'en-IN',
                target_language_code: 'hi-IN',
                speaker_gender: 'Female',
                mode: 'formal',
                model: 'sarvam-translate:v1'
            })
        });
        console.log("Translate Status:", sarvamResponse.status);
        console.log("Body:", await sarvamResponse.text());
    } catch (err) {
        console.error("Error:", err);
    }
}
test();
