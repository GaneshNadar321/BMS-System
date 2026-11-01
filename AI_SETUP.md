# AI Copilot Setup Guide

Your BatteryLab application includes an AI copilot (VoltAI) powered by Z.AI. To enable it, you need to configure the Z.AI SDK with your API key.

## 🔑 Getting Your Z.AI API Key

### Step 1: Register for Z.AI

1. Visit [Z.AI Open Platform](https://open.z.ai/)
2. Register or Login with your account
3. Navigate to **API Keys Management**
4. Click **Create API Key** (Standard API Key)
5. Copy your API key

### Step 2: Configure the SDK

You have two options:

#### Option A: Project-level Configuration (Recommended for this project)

Update the `.z-ai-config` file in your project root:

```json
{
  "baseUrl": "https://api.z.ai/api/paas/v4",
  "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
}
```

**Note**: The SDK requires both `baseUrl` (with `/v4` suffix) and `apiKey` fields.

#### Option B: User-level Configuration (Works for all your projects)

Create `~/.z-ai-config` (in your home directory):

**Windows:**
```powershell
# Create the file in your home directory
$config = @"
{
  "baseUrl": "https://api.z.ai/api/paas/v4",
  "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
}
"@
Set-Content -Path "$env:USERPROFILE\.z-ai-config" -Value $config
```

**macOS/Linux:**
```bash
cat > ~/.z-ai-config << 'EOF'
{
  "baseUrl": "https://api.z.ai/api/paas/v4",
  "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
}
EOF
```

## 🚀 Quick Start

After setting up your API key:

1. **Restart your development server** (if running)
2. Open your app at http://localhost:3000
3. Click the **AI Copilot** button or icon
4. Ask VoltAI questions about battery design!

## 💬 Example Questions for VoltAI

- "What's the optimal series/parallel configuration for a 48V 20Ah pack?"
- "Recommend a cell chemistry for an EV application"
- "Calculate the energy density of this pack"
- "What C-rate should I use for fast charging?"
- "Is this temperature safe for this cell?"
- "Design a 12S4P pack with Samsung 40T cells"

## 🛠️ Troubleshooting

### Error: "Configuration file not found"
- **Solution**: Make sure `.z-ai-config` exists in your project root or home directory
- Verify the file contains valid JSON with your `api_key`

### Error: "Invalid API key" or "Unauthorized"
- **Solution**: Double-check that you copied the correct API key from Z.AI dashboard
- Ensure there are no extra spaces or quotes around the key
- Make sure your API key is active (not expired or deleted)

### AI responses are slow
- **Solution**: This is normal for the first request. Subsequent requests are faster.
- Z.AI API might be experiencing high load

### Error: "Rate limit exceeded"
- **Solution**: You've hit your API quota
- Check your Z.AI dashboard for usage limits
- Upgrade your plan if needed

## 📊 Configuration File Format

The `.z-ai-config` file is a JSON file with the following structure:

```json
{
  "baseUrl": "https://api.z.ai/api/paas/v4",
  "apiKey": "your-api-key-here",
  "chatId": "optional-chat-id",
  "userId": "optional-user-id"
}
```

**Required fields:**
- `baseUrl`: Z.AI API endpoint (must include `/v4` suffix)
- `apiKey`: Your Z.AI API key

**Optional fields:**
- `chatId`: Custom chat ID for conversation tracking
- `userId`: Custom user ID for user tracking

## 🔒 Security Best Practices

### For Local Development:
- ✅ Use `.z-ai-config` in project root
- ✅ The file is already in `.gitignore` (won't be committed)

### For Production (Vercel):
- ❌ Don't use `.z-ai-config` file
- ✅ Use environment variables instead:

1. Go to your Vercel project
2. **Settings** → **Environment Variables**
3. Add: `ZAI_API_KEY` = your API key
4. Update the code to read from environment variable

**Update `src/app/api/copilot/route.ts`:**
```typescript
const zai = await ZAI.create({
  apiKey: process.env.ZAI_API_KEY || undefined
});
```

## 📝 Important Notes

1. **Never commit your API key to Git**
   - `.z-ai-config` is in `.gitignore` to prevent this
   - Always use environment variables in production

2. **API Key Security**
   - Treat your API key like a password
   - Don't share it publicly
   - Regenerate if compromised

3. **Free Tier Limits**
   - Z.AI may have rate limits on free tier
   - Check the [Z.AI pricing page](https://open.z.ai/pricing) for details

4. **Alternative AI Providers**
   - If you prefer, you can swap Z.AI for OpenAI, Anthropic, or other providers
   - You'll need to modify `src/app/api/copilot/route.ts`

## 🔗 Resources

- [Z.AI Developer Documentation](https://docs.z.ai/)
- [Z.AI Quick Start Guide](https://docs.z.ai/guides/overview/quick-start)
- [Z.AI API Reference](https://docs.z.ai/api-reference/introduction)
- [Z.AI Open Platform](https://open.z.ai/)

## ✅ Verification

To verify your setup is working:

1. Open your browser console (F12)
2. Interact with the AI Copilot in the app
3. You should see successful API calls (no errors)
4. VoltAI should respond to your questions

If you see errors in the console, refer to the troubleshooting section above.

---

Need help? Check the [Z.AI documentation](https://docs.z.ai/) or open an issue on GitHub.
