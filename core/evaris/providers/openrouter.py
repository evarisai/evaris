"""OpenRouter provider for unified LLM access.

OpenRouter provides a single API to access multiple LLM providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3, Claude 2)
- Google (Gemini)
- Meta (Llama)
- And many more

This is the default provider for Evaris as it simplifies API key management.
"""

import asyncio
import json
import logging
import os
from typing import Any

import httpx

from evaris.providers.base import BaseLLMProvider, ChatMessage, LLMResponse, ProviderConfig

logger = logging.getLogger(__name__)

# Default models for different use cases
DEFAULT_MODELS = {
    "evaluation": "anthropic/claude-3.5-sonnet",  # Best for evaluation
    "fast": "anthropic/claude-3-haiku",  # Fast and cheap
    "reasoning": "anthropic/claude-3.5-sonnet",  # Best reasoning
    "coding": "anthropic/claude-3.5-sonnet",  # Best for code
}

# Model pricing per million tokens (USD) - Updated Dec 2025
# Source: https://openrouter.ai/docs#models
MODEL_PRICING: dict[str, dict[str, float]] = {
    # Anthropic Claude models
    "anthropic/claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3.5-sonnet-20241022": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-haiku": {"input": 0.25, "output": 1.25},
    "anthropic/claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    "anthropic/claude-3-opus": {"input": 15.0, "output": 75.0},
    "anthropic/claude-3-sonnet": {"input": 3.0, "output": 15.0},
    # OpenAI GPT models
    "openai/gpt-4o": {"input": 2.5, "output": 10.0},
    "openai/gpt-4o-2024-11-20": {"input": 2.5, "output": 10.0},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},
    "openai/gpt-4o-mini-2024-07-18": {"input": 0.15, "output": 0.6},
    "openai/gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "openai/gpt-4": {"input": 30.0, "output": 60.0},
    "openai/gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
    # Google Gemini models
    "google/gemini-pro": {"input": 0.125, "output": 0.375},
    "google/gemini-pro-1.5": {"input": 1.25, "output": 5.0},
    "google/gemini-flash-1.5": {"input": 0.075, "output": 0.3},
    # Meta Llama models
    "meta-llama/llama-3.1-405b-instruct": {"input": 2.7, "output": 2.7},
    "meta-llama/llama-3.1-70b-instruct": {"input": 0.52, "output": 0.75},
    "meta-llama/llama-3.1-8b-instruct": {"input": 0.055, "output": 0.055},
    "meta-llama/llama-3-70b-instruct": {"input": 0.52, "output": 0.75},
    # Mistral models
    "mistralai/mistral-large": {"input": 2.0, "output": 6.0},
    "mistralai/mistral-medium": {"input": 2.7, "output": 8.1},
    "mistralai/mistral-small": {"input": 0.2, "output": 0.6},
    "mistralai/mixtral-8x7b-instruct": {"input": 0.24, "output": 0.24},
    # Default fallback for unknown models (conservative estimate)
    "_default": {"input": 1.0, "output": 3.0},
}


class OpenRouterProvider(BaseLLMProvider):
    """OpenRouter LLM provider.

    Access multiple LLM providers through a single API.

    Example:
        >>> config = ProviderConfig(
        ...     api_key=os.getenv("OPENROUTER_API_KEY"),
        ...     model="anthropic/claude-3.5-sonnet"
        ... )
        >>> provider = OpenRouterProvider(config)
        >>> response = await provider.a_complete("Evaluate this output...")
    """

    name = "openrouter"
    supports_tools = True
    supports_vision = True

    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(
        self,
        config: ProviderConfig | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ):
        """Initialize OpenRouter provider.

        Args:
            config: Full provider config
            api_key: API key (can also use OPENROUTER_API_KEY env var)
            model: Model to use (default: claude-3.5-sonnet)
        """
        env_key = os.getenv("OPENROUTER_API_KEY")
        resolved_key = api_key or (config.api_key if config else None) or env_key

        if config is None:
            config = ProviderConfig(
                api_key=resolved_key,
                model=model or DEFAULT_MODELS["evaluation"],
            )
        elif not config.api_key and resolved_key:
            config = ProviderConfig(
                api_key=resolved_key,
                model=config.model or model or DEFAULT_MODELS["evaluation"],
                base_url=config.base_url,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                timeout=config.timeout,
                max_retries=config.max_retries,
            )

        super().__init__(config)

        if not self.config.api_key:
            raise ValueError(
                "OpenRouter API key required. Set OPENROUTER_API_KEY env var "
                "or pass api_key parameter."
            )

        self._client: httpx.Client | None = None
        self._async_client: httpx.AsyncClient | None = None

    def _get_headers(self) -> dict[str, str]:
        """Get request headers."""
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://evaris.dev",  # For OpenRouter analytics
            "X-Title": "Evaris Evaluation Framework",
        }

    def _get_client(self) -> httpx.Client:
        """Get or create sync HTTP client."""
        if self._client is None:
            self._client = httpx.Client(
                base_url=self.config.base_url or self.BASE_URL,
                headers=self._get_headers(),
                timeout=self.config.timeout,
            )
        return self._client

    def _get_async_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.config.base_url or self.BASE_URL,
                headers=self._get_headers(),
                timeout=self.config.timeout,
            )
        return self._async_client

    def _build_request(
        self,
        prompt: str,
        system_prompt: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Build the API request body."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        request = {
            "model": self.config.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        if tools:
            request["tools"] = tools
            request["tool_choice"] = kwargs.get("tool_choice", "auto")

        return request

    def _calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> float:
        """Calculate cost in USD based on model pricing and token usage.

        Args:
            model: Model identifier (e.g., "anthropic/claude-3.5-sonnet")
            input_tokens: Number of prompt/input tokens
            output_tokens: Number of completion/output tokens

        Returns:
            Cost in USD. Uses default pricing if model not in pricing table.
        """
        # Try exact match first, then fallback to default pricing
        pricing = MODEL_PRICING.get(model)
        if not pricing:
            # Log unknown model for future addition
            logger.debug(f"Unknown model pricing for {model}, using default rates")
            pricing = MODEL_PRICING["_default"]

        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost

    def _parse_response(self, response: dict[str, Any]) -> LLMResponse:
        """Parse OpenRouter API response."""
        choice = response.get("choices", [{}])[0]
        message = choice.get("message", {})

        content = message.get("content", "")
        tool_calls = message.get("tool_calls")

        # Parse tool calls if present
        parsed_tool_calls = None
        if tool_calls:
            parsed_tool_calls = []
            for tc in tool_calls:
                func = tc.get("function", {})
                parsed_tool_calls.append(
                    {
                        "id": tc.get("id"),
                        "name": func.get("name"),
                        "arguments": json.loads(func.get("arguments", "{}")),
                    }
                )

        usage = response.get("usage", {})
        model = response.get("model") or self.config.model or ""
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        # Calculate cost based on model pricing
        cost_usd = self._calculate_cost(model, input_tokens, output_tokens)

        return LLMResponse(
            content=content,
            model=model,
            usage={
                "prompt_tokens": input_tokens,
                "completion_tokens": output_tokens,
                "total_tokens": usage.get("total_tokens", 0),
            },
            tool_calls=parsed_tool_calls,
            raw_response=response,
            metadata={
                "provider": "openrouter",
                "finish_reason": choice.get("finish_reason"),
            },
            cost_usd=cost_usd,
        )

    def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Generate a completion synchronously.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            tools: Optional tool schemas
            **kwargs: Additional parameters

        Returns:
            LLMResponse with the completion
        """
        client = self._get_client()
        request = self._build_request(prompt, system_prompt, tools, **kwargs)

        for attempt in range(self.config.max_retries):
            try:
                response = client.post("/chat/completions", json=request)
                response.raise_for_status()
                return self._parse_response(response.json())

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limit
                    wait_time = 2**attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s...")
                    import time

                    time.sleep(wait_time)
                    continue
                raise

            except httpx.RequestError as e:
                if attempt < self.config.max_retries - 1:
                    logger.warning(f"Request failed, retrying: {e}")
                    continue
                raise

        raise RuntimeError("Max retries exceeded")

    async def a_complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Generate a completion asynchronously.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            tools: Optional tool schemas
            **kwargs: Additional parameters

        Returns:
            LLMResponse with the completion
        """
        client = self._get_async_client()
        request = self._build_request(prompt, system_prompt, tools, **kwargs)

        for attempt in range(self.config.max_retries):
            try:
                response = await client.post("/chat/completions", json=request)
                response.raise_for_status()
                return self._parse_response(response.json())

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limit
                    wait_time = 2**attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                raise

            except httpx.RequestError as e:
                if attempt < self.config.max_retries - 1:
                    logger.warning(f"Request failed, retrying: {e}")
                    continue
                raise

        raise RuntimeError("Max retries exceeded")

    def chat(
        self,
        messages: list[ChatMessage],
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Multi-turn chat completion.

        Args:
            messages: List of message dicts
            tools: Optional tool schemas
            **kwargs: Additional parameters

        Returns:
            LLMResponse with the completion
        """
        client = self._get_client()

        request = {
            "model": self.config.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        if tools:
            request["tools"] = tools

        response = client.post("/chat/completions", json=request)
        response.raise_for_status()
        return self._parse_response(response.json())

    async def a_chat(
        self,
        messages: list[ChatMessage],
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Multi-turn chat completion (async).

        Args:
            messages: List of message dicts
            tools: Optional tool schemas
            **kwargs: Additional parameters

        Returns:
            LLMResponse with the completion
        """
        client = self._get_async_client()

        request = {
            "model": self.config.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        if tools:
            request["tools"] = tools

        response = await client.post("/chat/completions", json=request)
        response.raise_for_status()
        return self._parse_response(response.json())

    def close(self) -> None:
        """Close HTTP clients."""
        client = getattr(self, "_client", None)
        if client:
            client.close()
            self._client = None

    async def aclose(self) -> None:
        """Close async HTTP client."""
        client = getattr(self, "_async_client", None)
        if client:
            await client.aclose()
            self._async_client = None

    def __del__(self) -> None:
        """Cleanup on deletion."""
        try:
            self.close()
        except Exception:
            pass
