"""llm_streaming 单元测试 — 不调用真实 LLM"""
from __future__ import annotations

from unittest.mock import MagicMock

from app.services.llm_streaming import build_text_chain, resolve_chat_model


def test_resolve_chat_model_unwraps_llm_service():
    inner = object()
    wrapper = MagicMock()
    wrapper.llm = inner
    assert resolve_chat_model(wrapper) is inner


def test_resolve_chat_model_passes_through_runnable():
    runnable = object()
    assert resolve_chat_model(runnable) is runnable


def test_build_text_chain_accepts_llm_service_without_type_error():
    """曾误传 LLMService 导致 LangChain TypeError；应解包为 .llm。"""
    inner = MagicMock(name='chat_model')
    wrapper = MagicMock()
    wrapper.llm = inner
    chain = build_text_chain(wrapper, [('system', 'test'), ('user', 'hi')])
    assert chain is not None
    assert len(chain.steps) == 3
