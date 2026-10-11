import ai_agent

print("client:", ai_agent.client)
print("model :", ai_agent.GEMINI_MODEL)

try:
    r = ai_agent.client.models.generate_content(
        model=ai_agent.GEMINI_MODEL, contents="Say hi"
    )
    print("OK ->", r.text)
except Exception as e:
    print("ERROR ->", e)

print("\nAvailable models:")
try:
    for m in ai_agent.client.models.list():
        print(" ", m.name)
except Exception as e:
    print("LIST ERROR ->", e)