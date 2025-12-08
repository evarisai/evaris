"""
Tracing and Observability Example

Demonstrates instrumenting your application with traces and observations.
Traces capture the execution flow of your AI application including:
- Span: Generic operation (function calls, database queries)
- Generation: LLM API calls with token/cost tracking
- Event: Point-in-time occurrences (errors, user actions)
"""

import asyncio
import os
import time
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

try:
    from openai import AsyncOpenAI
except ImportError:
    raise ImportError("Install openai: pip install openai")

from evaris_client import (
    EvarisClient,
    Observation,
    ObservationType,
    TraceStatus,
    LogLevel,
)

load_dotenv()


class TracedChatAgent:
    """Chat agent with built-in tracing for observability."""

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.evaris = EvarisClient(
            api_key=os.getenv("EVARIS_API_KEY"),
            base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
        )

    async def chat_with_rag(
        self,
        user_message: str,
        session_id: str,
        user_id: str = "user_demo",
    ) -> str:
        """
        Process a chat message with RAG (Retrieval Augmented Generation).
        This demonstrates a typical traced workflow:
        1. Retrieve relevant documents
        2. Generate response with context
        3. Send trace to Evaris
        """
        trace_id = str(uuid.uuid4())
        root_span_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)

        observations: list[Observation] = []

        # Root span for entire request
        root_span = Observation(
            span_id=root_span_id,
            type=ObservationType.SPAN,
            name="chat_with_rag",
            start_time=start_time,
            input={"user_message": user_message},
            attributes={"session_id": session_id, "user_id": user_id},
        )

        # Step 1: Document retrieval (simulated)
        retrieval_span_id = str(uuid.uuid4())
        retrieval_start = datetime.now(timezone.utc)
        retrieved_docs = await self._retrieve_documents(user_message)
        retrieval_end = datetime.now(timezone.utc)

        retrieval_span = Observation(
            span_id=retrieval_span_id,
            parent_span_id=root_span_id,
            type=ObservationType.SPAN,
            name="retrieve_documents",
            start_time=retrieval_start,
            end_time=retrieval_end,
            duration_ms=int((retrieval_end - retrieval_start).total_seconds() * 1000),
            status=TraceStatus.OK,
            input={"query": user_message},
            output={"doc_count": len(retrieved_docs)},
            attributes={"retriever": "vector_db", "top_k": 3},
        )

        # Step 2: LLM Generation
        generation_span_id = str(uuid.uuid4())
        generation_start = datetime.now(timezone.utc)

        context = "\n".join(retrieved_docs)
        response, usage = await self._generate_response(user_message, context)

        generation_end = datetime.now(timezone.utc)

        generation_span = Observation(
            span_id=generation_span_id,
            parent_span_id=root_span_id,
            type=ObservationType.GENERATION,  # LLM-specific observation
            name="openai_completion",
            start_time=generation_start,
            end_time=generation_end,
            duration_ms=int((generation_end - generation_start).total_seconds() * 1000),
            status=TraceStatus.OK,
            model="gpt-4o-mini",
            model_params={"temperature": 0.7, "max_tokens": 500},
            input={"system": "RAG assistant", "user": user_message, "context": context[:200]},
            output=response,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            cost=self._estimate_cost(usage),  # Simplified cost estimation
        )

        # Add event for logging
        event = Observation(
            span_id=str(uuid.uuid4()),
            parent_span_id=root_span_id,
            type=ObservationType.EVENT,
            name="response_generated",
            start_time=datetime.now(timezone.utc),
            event_name="chat_response",
            attributes={
                "response_length": len(response),
                "docs_used": len(retrieved_docs),
            },
        )

        # Complete root span
        end_time = datetime.now(timezone.utc)
        root_span.end_time = end_time
        root_span.duration_ms = int((end_time - start_time).total_seconds() * 1000)
        root_span.status = TraceStatus.OK
        root_span.output = {"response": response[:100] + "..."}
        root_span.children = [retrieval_span, generation_span, event]

        observations.append(root_span)

        # Send trace to Evaris
        async with self.evaris:
            trace_result = await self.evaris.trace(
                name="chat_with_rag",
                project_id="proj_example",  # Replace with your project ID
                observations=observations,
                session_id=session_id,
                user_id=user_id,
                environment="development",
                release="v1.0.0",
                tags=["rag", "chat"],
                metadata={"model": "gpt-4o-mini"},
            )

            # Also log the interaction
            await self.evaris.log(
                level=LogLevel.INFO,
                message=f"Chat completed: {user_message[:50]}...",
                project_id="proj_example",
                trace_id=trace_result.trace_id,
                metadata={
                    "user_id": user_id,
                    "session_id": session_id,
                    "response_length": len(response),
                },
            )

            return response, trace_result

    async def _retrieve_documents(self, query: str) -> list[str]:
        """Simulate document retrieval (replace with actual vector DB query)."""
        await asyncio.sleep(0.1)  # Simulate latency
        return [
            "Document 1: AI assistants can help with various tasks including coding, writing, and analysis.",
            "Document 2: Machine learning models are trained on large datasets to learn patterns.",
            "Document 3: Natural language processing enables computers to understand human language.",
        ]

    async def _generate_response(
        self, user_message: str, context: str
    ) -> tuple[str, dict]:
        """Generate response using OpenAI."""
        response = await self.openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant. Use this context to answer:\n\n{context}",
                },
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }

        return response.choices[0].message.content or "", usage

    def _estimate_cost(self, usage: dict) -> float:
        """Estimate cost for gpt-4o-mini (simplified)."""
        input_cost = (usage.get("prompt_tokens", 0) / 1_000_000) * 0.15
        output_cost = (usage.get("completion_tokens", 0) / 1_000_000) * 0.60
        return input_cost + output_cost


async def main():
    agent = TracedChatAgent()

    # Simulate a user session with multiple messages
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    user_id = "user_demo_123"

    messages = [
        "What is machine learning?",
        "How do neural networks work?",
        "Can you give me an example of NLP?",
    ]

    print(f"Session ID: {session_id}")
    print(f"User ID: {user_id}")
    print("=" * 60)

    for msg in messages:
        print(f"\nUser: {msg}")
        response, trace_result = await agent.chat_with_rag(
            user_message=msg,
            session_id=session_id,
            user_id=user_id,
        )
        print(f"Agent: {response[:200]}...")
        print(f"  [Trace ID: {trace_result.trace_id}]")
        print(f"  [Duration: {trace_result.duration_ms}ms]")
        print(f"  [Observations: {trace_result.observation_count}]")
        if trace_result.total_tokens:
            print(f"  [Tokens: {trace_result.total_tokens}]")
        if trace_result.total_cost:
            print(f"  [Cost: ${trace_result.total_cost:.6f}]")


if __name__ == "__main__":
    asyncio.run(main())
