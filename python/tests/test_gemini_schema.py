from sensel_agent import Tool, ToolResult
from sensel_agent.profile import Model
from sensel_agent.provider import gemini_request


async def probe(arguments, context):
    return ToolResult('completed', {'synthetic': True})


def test_gemini_json_schema_preserves_strict_nested_tool_contract():
    schema = {'type': 'object', 'additionalProperties': False, 'properties': {
        'query': {'type': 'object', 'additionalProperties': False,
                  'properties': {'from': {'type': 'string'}}}}}
    tool = Tool('probe', 'Synthetic probe', schema, probe)
    body = gemini_request([{'role': 'user', 'content': 'synthetic'}], {'probe': tool},
                          Model(provider='gemini', model='synthetic'))
    declaration = body['tools'][0]['functionDeclarations'][0]
    assert declaration['parametersJsonSchema'] == schema
    assert 'parameters' not in declaration
    assert schema['properties']['query']['additionalProperties'] is False
