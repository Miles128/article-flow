"""LangChain 流式输出工具"""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable


def chunk_to_text(chunk: object) -> str:
    if chunk is None:
        return ''
    if isinstance(chunk, str):
        return chunk
    content = getattr(chunk, 'content', None)
    if isinstance(content, str):
        return content
    if content is not None:
        return str(content)
    return str(chunk) if chunk else ''


def iter_chain_text(chain: Runnable[Any, Any], input_vars: dict[str, Any] | None = None) -> Iterator[str]:
    for chunk in chain.stream(input_vars or {}):
        text = chunk_to_text(chunk)
        if text:
            yield text


def iter_llm_messages(llm: Any, messages: list[Any]) -> Iterator[str]:
    for chunk in llm.stream(messages):
        text = chunk_to_text(chunk)
        if text:
            yield text


def resolve_chat_model(llm: Any) -> Any:
    """LLMService 包装器解包为 LangChain Runnable。"""
    inner = getattr(llm, 'llm', None)
    return inner if inner is not None else llm


def build_text_chain(llm: Any, messages: list[tuple[str, str]]) -> Runnable[Any, Any]:
    from langchain_core.prompts import ChatPromptTemplate

    prompt = ChatPromptTemplate.from_messages(messages)
    return prompt | resolve_chat_model(llm) | StrOutputParser()
