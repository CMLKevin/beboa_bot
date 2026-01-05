# Custom Tools

Guide to adding new AI tools to Beboa.

## Tool Architecture

Tools let Beboa perform actions beyond text generation:

```
User: "Draw a cat"
         │
         ▼
   AI decides to use tool
         │
         ▼
   Tool call: generate_image({ prompt: "cat" })
         │
         ▼
   Tool handler executes
         │
         ▼
   Result sent to user
```

## Creating a Tool

### Step 1: Define the Tool Schema

In `src/services/tools.js`:

```javascript
const weatherTool = {
    type: "function",
    function: {
        name: "get_weather",
        description: "Get the current weather for a location. Use this when users ask about weather.",
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "City name or location, e.g., 'San Francisco, CA'"
                },
                units: {
                    type: "string",
                    enum: ["celsius", "fahrenheit"],
                    description: "Temperature units"
                }
            },
            required: ["location"]
        }
    }
};
```

### Step 2: Implement the Handler

```javascript
async function handleWeather(params) {
    const { location, units = 'celsius' } = params;

    try {
        // Call weather API
        const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${encodeURIComponent(location)}`
        );

        if (!response.ok) {
            return { success: false, error: 'Location not found' };
        }

        const data = await response.json();
        const temp = units === 'celsius'
            ? data.current.temp_c
            : data.current.temp_f;

        return {
            success: true,
            result: {
                location: data.location.name,
                temperature: temp,
                units: units,
                condition: data.current.condition.text,
                humidity: data.current.humidity
            }
        };
    } catch (error) {
        console.error('[WEATHER TOOL ERROR]', error);
        return { success: false, error: 'Failed to fetch weather' };
    }
}
```

### Step 3: Register the Tool

```javascript
const toolRegistry = {
    generate_image: {
        definition: imageTool,
        handler: handleImageGeneration,
        enabled: () => process.env.IMAGE_GEN_ENABLED === 'true'
    },
    roll_dice: {
        definition: diceTool,
        handler: handleDiceRoll,
        enabled: () => true
    },
    // Add your new tool:
    get_weather: {
        definition: weatherTool,
        handler: handleWeather,
        enabled: () => !!process.env.WEATHER_API_KEY
    }
};
```

### Step 4: Add Environment Variable (if needed)

```env
WEATHER_API_KEY=your_api_key_here
```

## Tool Definition Schema

### Basic Structure

```javascript
{
    type: "function",
    function: {
        name: "tool_name",           // Unique identifier
        description: "...",          // When AI should use this
        parameters: {
            type: "object",
            properties: { ... },     // Input parameters
            required: [ ... ]        // Required parameters
        }
    }
}
```

### Parameter Types

**String:**
```javascript
property_name: {
    type: "string",
    description: "What this parameter is for"
}
```

**String with choices:**
```javascript
property_name: {
    type: "string",
    enum: ["option1", "option2", "option3"],
    description: "Select one of these options"
}
```

**Number:**
```javascript
property_name: {
    type: "number",
    description: "A numeric value",
    minimum: 0,
    maximum: 100
}
```

**Integer:**
```javascript
property_name: {
    type: "integer",
    description: "A whole number"
}
```

**Boolean:**
```javascript
property_name: {
    type: "boolean",
    description: "True or false flag"
}
```

**Array:**
```javascript
property_name: {
    type: "array",
    items: { type: "string" },
    description: "List of strings"
}
```

## Handler Best Practices

### Return Format

Always return an object with `success` and either `result` or `error`:

```javascript
// Success
return {
    success: true,
    result: { /* data */ }
};

// Failure
return {
    success: false,
    error: "Human-readable error message"
};
```

### Error Handling

```javascript
async function handleMyTool(params) {
    try {
        // Validate input
        if (!params.requiredField) {
            return { success: false, error: 'Missing required field' };
        }

        // Do the thing
        const result = await doSomething(params);

        return { success: true, result };

    } catch (error) {
        console.error('[MY_TOOL ERROR]', error);

        // Return user-friendly error
        return {
            success: false,
            error: error.message || 'Something went wrong'
        };
    }
}
```

### Rate Limiting

For expensive operations:

```javascript
const toolCooldowns = new Map();

async function handleExpensiveTool(params, userId) {
    const cooldownKey = `expensive_tool:${userId}`;
    const lastUse = toolCooldowns.get(cooldownKey);

    if (lastUse && Date.now() - lastUse < 60000) {
        return {
            success: false,
            error: 'Please wait a minute before using this again'
        };
    }

    toolCooldowns.set(cooldownKey, Date.now());

    // Continue with operation...
}
```

## Tool Execution Flow

The tools system processes calls like this:

```javascript
// In chat.js
export async function handleToolCalls(response, message) {
    const toolCalls = response.choices[0].message.tool_calls;

    for (const toolCall of toolCalls) {
        const { name, arguments: argsJson } = toolCall.function;
        const args = JSON.parse(argsJson);

        // Get handler
        const tool = toolRegistry[name];
        if (!tool) {
            console.error(`Unknown tool: ${name}`);
            continue;
        }

        // Execute handler
        const result = await tool.handler(args, message.author.id);

        // Handle result
        if (result.success) {
            await sendToolResult(message, name, result.result);
        } else {
            await message.reply(`Tool error: ${result.error}`);
        }
    }
}
```

## Complete Example: Random Quote Tool

```javascript
// Tool definition
const quoteTool = {
    type: "function",
    function: {
        name: "random_quote",
        description: "Get a random inspirational or funny quote. Use when users ask for motivation, inspiration, or quotes.",
        parameters: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    enum: ["inspirational", "funny", "wisdom", "random"],
                    description: "Category of quote"
                }
            },
            required: []
        }
    }
};

// Handler
async function handleRandomQuote(params) {
    const { category = 'random' } = params;

    const quotes = {
        inspirational: [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
        ],
        funny: [
            { text: "I'm not lazy, I'm on energy-saving mode.", author: "Unknown" },
            { text: "I used to think I was indecisive, but now I'm not so sure.", author: "Unknown" }
        ],
        wisdom: [
            { text: "The only true wisdom is knowing you know nothing.", author: "Socrates" },
            { text: "In the middle of difficulty lies opportunity.", author: "Einstein" }
        ]
    };

    // Get quotes pool
    let pool;
    if (category === 'random') {
        pool = Object.values(quotes).flat();
    } else {
        pool = quotes[category] || quotes.inspirational;
    }

    // Pick random quote
    const quote = pool[Math.floor(Math.random() * pool.length)];

    return {
        success: true,
        result: {
            quote: quote.text,
            author: quote.author,
            category: category
        }
    };
}

// Register
const toolRegistry = {
    // ... other tools
    random_quote: {
        definition: quoteTool,
        handler: handleRandomQuote,
        enabled: () => true
    }
};
```

## Testing Tools

### Manual Testing

1. Add console logs to handler
2. Restart bot
3. Trigger tool via chat: "@Beboa give me a quote"
4. Check logs for execution

### Debug Mode

```javascript
const DEBUG_TOOLS = process.env.DEBUG_TOOLS === 'true';

async function handleMyTool(params) {
    if (DEBUG_TOOLS) {
        console.log('[TOOL DEBUG]', { name: 'my_tool', params });
    }

    // ... rest of handler

    if (DEBUG_TOOLS) {
        console.log('[TOOL DEBUG] Result:', result);
    }

    return result;
}
```

## Tips

1. **Clear descriptions** - Help AI know when to use the tool
2. **Validate inputs** - Don't trust parameter values blindly
3. **Handle failures** - Always return meaningful errors
4. **Rate limit expensive ops** - Prevent abuse
5. **Log for debugging** - Track tool usage
6. **Test edge cases** - Empty inputs, special characters, etc.
