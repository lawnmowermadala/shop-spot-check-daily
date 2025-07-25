Getting Started
Puter.js works without any API keys or sign-ups. To start using Puter.js, include the following script tag in your HTML file, either in the <head> or <body> section:

<script src="https://js.puter.com/v2/"></script>
You're now ready to use Puter.js for free access to DeepSeek capabilities. No API keys or sign-ups are required.

Example 1Basic Text Generation with DeepSeek Chat (DeepSeek V3)
Here's a simple example showing how to generate text using DeepSeek Chat (DeepSeek V3):

<html>
<body>
    <script src="https://js.puter.com/v2/"></script>
    <script>
        puter.ai.chat("Explain quantum entanglement in simple terms", {
            model: 'deepseek-chat'
        }).then(response => {
            document.write(response.message.content);
        });
    </script>
</body>
</html>
Using the puter.ai.chat() function, you can generate text using DeepSeek Chat.

Example 2Complex Reasoning with DeepSeek Reasoner (DeepSeek R1)
DeepSeek Reasoner (DeepSeek R1) is particularly good at complex problem-solving and step-by-step analysis:

<html>
<body>
    <script src="https://js.puter.com/v2/"></script>
    <script>
        puter.ai.chat(
            "What would be the environmental impact of replacing all cars with electric vehicles? Consider both positive and negative effects.", 
            {
                model: 'deepseek-reasoner'
            }
        ).then(response => {
            document.write(response.message.content);
        });
    </script>
</body>
</html>
Example 3Streaming Responses
