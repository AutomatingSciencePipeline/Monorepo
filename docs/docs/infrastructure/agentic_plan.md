# Agentic Implementation Plan

## 1. Problem and Context
With the successful launch of the CLI, the next step is to make the GLaDOS platform compatible with Model Context Protocol (MCP) tool calls so that experiments can be carried out be autonomous Artificial General Inteligence (AGI) agents. Specifically, the goal is to give the user the ability to delegate actions they can take on the platform manually to an AI agent that performs them on their behalf.

After some consideration, the team decided that it is recommended to pursure a local MCP facade that calls to existing REST endpoints with authentication done via token introspection. For more details on this decision consult section 5 and 6 of this document. 


## 2. Scope and limitations
Limitation and scope, what the feature can do and can't do


## 3. Invariants

#### 3.1 Functional Invariant
Let `t` be an MCP tool call, and `ENDPOINT` be an authenticated call (using a stored `token` for the active session) to the existing REST API counterpart for `t`. For all tool invocation with arguments `t(args)`, the following premises must hold:

**1. Structural**
The invocation of `t(args)` causes exactly one ENDPOINT call to be reported to the caller. The MCP _MAY_ retry on transport failure up to a bounded number of times before surfacing failure; retries are not counted as separate logical calls.

**2. Payload**
Content of `args` must not be modified beyond translation to comply with `ENDPOINT` argument schema. A translation here is defined as a syntactic transformation using a declared schema, no values should be transformed.

**3. Response Content**
Given that the MCP tool call is going to translate the REST response into an MCP response, the MCP response carries no information not present in the REST response; fields may be dropped, but never fabricated, inferred, or sourced from outside the REST response.

#### 3.2 Security Invariant



## 4. Architecture Overview
Component diagrams and dataflow naratives. Add a subheader for each supporting subsystem
#### 4.1 Authentication Subsystem
Some details on token introspection, and accompanying diagrams if applicable

#### 4.2 

## 5. Implementation notes
Some useful implementation notes
### 5.1 Strive for enforcement through architecture and design rather than prompt engineering
An LLM at the end of the day is a probabilistic model. Because of that, banking on the fact that it output will be governable and deterministic is a naive assumption. If you wish for the agent to not attempt an action, then the architecture should never allow for such cases. For example, instead of prompting "Do not read the content of this secret file," you can instead design the system so that the agent can issue a directive to handle such files to an MCP server instead. Now, the agent concern is no longer "I must not touch this file" but rather "I interact with this server to carry out the function on my behalf", which is easier to enforce and control. 



## 6. Alternatives Considered
Implementations that were considered

#### 6.1 MCP as an extention of the current `Next.js` REST API
The team initially considered the possibility of extending the current service layer to also support MCP tool calls and have initially scoped the problem accordingly. However, due to the way authentication is handled via token introspection, the we realized that potentially exposing the user's Github token is a real risk as the MCP protocol does not support passing along sensitive credentials to be evaluated up stream. For this implementation alternative to be considered, authentication have to be done in a different manner that comply with the [MCP official security standards](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

### 1. MCP implementation as an extension to the existing service layer via `Next.js`


## 7. Threat Modeling

## 8. Testing strategy

## 9. Unresolved decisions

## 10. References




