from app.utils import get_field, get_query_arg


def test_get_field_snake_and_camel() -> None:
    data = {'pass_type': 'content', 'section_info': {'title': 'x'}}
    assert get_field(data, 'passType', 'pass_type') == 'content'
    assert get_field(data, 'sectionInfo', 'section_info') == {'title': 'x'}
    assert get_field(data, 'missing', default='fallback') == 'fallback'


def test_get_query_arg_aliases() -> None:
    class Args(dict):
        def get(self, key, default=None):
            return super().get(key, default)

    args = Args({'max_results': '15'})
    assert get_query_arg(args, 'maxResults', 'max_results') == '15'
