import re
import statistics
from .. import db_data as db
from ..models import _gen_id, _now


class StyleProfile:
    @classmethod
    def create(cls, name, style_data, source_texts=None):
        doc = {
            '_id': _gen_id(),
            'name': name,
            'style_data': style_data,
            'source_texts': source_texts or [],
            'created_at': _now(),
            'updated_at': _now(),
        }
        db['style_profiles'].insert_one(doc)
        return doc

    @classmethod
    def get_by_id(cls, profile_id):
        return db['style_profiles'].find_one({'_id': profile_id})

    @classmethod
    def get_all(cls):
        return db['style_profiles'].find(sort=[('updated_at', -1)])

    @classmethod
    def update(cls, profile_id, data):
        data['updated_at'] = _now()
        data.pop('_id', None)
        result = db['style_profiles'].update_one({'_id': profile_id}, {'$set': data})
        return result.modified_count > 0

    @classmethod
    def delete(cls, profile_id):
        result = db['style_profiles'].delete_one({'_id': profile_id})
        return result.deleted_count > 0


class StyleAnalyzer:

    @staticmethod
    def analyze_texts(texts):
        all_paragraphs = []
        all_sentences = []
        all_words = []
        paragraph_lengths = []
        sentence_lengths = []

        for text in texts:
            if not text or not text.strip():
                continue
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n|\n', text) if p.strip()]
            all_paragraphs.extend(paragraphs)

            for para in paragraphs:
                sentences = re.split(r'[。！？；!?;]', para)
                sentences = [s.strip() for s in sentences if s.strip()]
                all_sentences.extend(sentences)

                words = re.findall(r'[\u4e00-\u9fff]|[a-zA-Z]+', para)
                all_words.extend(words)

                para_char_count = len(para.replace(' ', '').replace('\n', ''))
                paragraph_lengths.append(para_char_count)

            for sent in all_sentences:
                sent_char_count = len(sent.replace(' ', ''))
                sentence_lengths.append(sent_char_count)

        if not paragraph_lengths:
            return None

        avg_para_len = statistics.mean(paragraph_lengths) if paragraph_lengths else 0
        median_para_len = statistics.median(paragraph_lengths) if paragraph_lengths else 0
        avg_sent_len = statistics.mean(sentence_lengths) if sentence_lengths else 0
        median_sent_len = statistics.median(sentence_lengths) if sentence_lengths else 0

        short_paras = sum(1 for length in paragraph_lengths if length < 50)
        medium_paras = sum(1 for length in paragraph_lengths if 50 <= length < 150)
        long_paras = sum(1 for length in paragraph_lengths if length >= 150)
        total_paras = len(paragraph_lengths) or 1

        short_sents = sum(1 for length in sentence_lengths if length < 15)
        medium_sents = sum(1 for length in sentence_lengths if 15 <= length < 35)
        long_sents = sum(1 for length in sentence_lengths if length >= 35)
        total_sents = len(sentence_lengths) or 1

        has_lists = any(re.search(r'^\s*[-*•]\s|^\s*\d+[.、)]\s', text, re.MULTILINE) for text in texts)
        has_headers = any(re.search(r'^#{1,6}\s', text, re.MULTILINE) for text in texts)
        has_quotes = any(re.search(r'^>\s', text, re.MULTILINE) for text in texts)
        has_bold = any(re.search(r'\*\*.*?\*\*|__.*?__', text) for text in texts)

        exclamation_count = sum(text.count('！') + text.count('!') for text in texts)
        question_count = sum(text.count('？') + text.count('?') for text in texts)
        total_punct = sum(
            sum(1 for c in text if c in '。，、；：""''（）！？—…,.;:!?"\'-()')
            for text in texts
        ) or 1

        sentence_starters = {}
        for sent in all_sentences:
            first_4 = sent[:4].strip()
            if first_4:
                sentence_starters[first_4] = sentence_starters.get(first_4, 0) + 1
        top_starters = sorted(sentence_starters.items(), key=lambda x: -x[1])[:10]

        connectors = {}
        connector_patterns = [
            '但是', '然而', '不过', '可是', '因此', '所以', '因为', '而且',
            '并且', '同时', '此外', '另外', '首先', '其次', '最后', '总之',
            '换句话说', '也就是说', '事实上', '实际上', '值得注意的是',
            '不仅如此', '更重要的是', '与此同时', '一方面', '另一方面',
        ]
        for text in texts:
            for conn in connector_patterns:
                count = text.count(conn)
                if count > 0:
                    connectors[conn] = connectors.get(conn, 0) + count
        top_connectors = sorted(connectors.items(), key=lambda x: -x[1])[:10]

        return {
            'paragraph': {
                'avg_length': round(avg_para_len, 1),
                'median_length': round(median_para_len, 1),
                'min_length': min(paragraph_lengths) if paragraph_lengths else 0,
                'max_length': max(paragraph_lengths) if paragraph_lengths else 0,
                'distribution': {
                    'short': round(short_paras / total_paras * 100, 1),
                    'medium': round(medium_paras / total_paras * 100, 1),
                    'long': round(long_paras / total_paras * 100, 1),
                },
                'total_count': len(paragraph_lengths),
            },
            'sentence': {
                'avg_length': round(avg_sent_len, 1),
                'median_length': round(median_sent_len, 1),
                'min_length': min(sentence_lengths) if sentence_lengths else 0,
                'max_length': max(sentence_lengths) if sentence_lengths else 0,
                'distribution': {
                    'short': round(short_sents / total_sents * 100, 1),
                    'medium': round(medium_sents / total_sents * 100, 1),
                    'long': round(long_sents / total_sents * 100, 1),
                },
                'total_count': len(sentence_lengths),
            },
            'formatting': {
                'uses_lists': has_lists,
                'uses_headers': has_headers,
                'uses_quotes': has_quotes,
                'uses_bold': has_bold,
            },
            'tone': {
                'exclamation_ratio': round(exclamation_count / total_punct * 100, 2),
                'question_ratio': round(question_count / total_punct * 100, 2),
            },
            'sentence_starters': [{'text': s[0], 'count': s[1]} for s in top_starters],
            'connectors': [{'text': c[0], 'count': c[1]} for c in top_connectors],
            'total_chars': sum(len(t) for t in texts),
            'source_count': len(texts),
        }

    @staticmethod
    def generate_style_prompt(style_data):
        if not style_data:
            return ''

        p = style_data['paragraph']
        s = style_data['sentence']
        f = style_data['formatting']
        t = style_data['tone']

        parts = [
            "## 写作风格指南\n",
            "### 段落风格",
            f"- 平均段落长度: {p['avg_length']}字，中位数{p['median_length']}字",
            f"- 段落长度分布: 短段({p['distribution']['short']}%) / 中段({p['distribution']['medium']}%) / 长段({p['distribution']['long']}%)",
            "",
            "### 句式风格",
            f"- 平均句子长度: {s['avg_length']}字，中位数{s['median_length']}字",
            f"- 句子长度分布: 短句({s['distribution']['short']}%) / 中句({s['distribution']['medium']}%) / 长句({s['distribution']['long']}%)",
            "",
            "### 排版习惯",
        ]

        if f['uses_headers']:
            parts.append("- 使用标题/小标题分段")
        if f['uses_lists']:
            parts.append("- 使用列表罗列要点")
        if f['uses_quotes']:
            parts.append("- 使用引用块强调")
        if f['uses_bold']:
            parts.append("- 使用加粗强调关键词")

        parts.append("\n### 语气特征")
        if t['exclamation_ratio'] > 5:
            parts.append("- 语气较激动，频繁使用感叹号")
        elif t['exclamation_ratio'] > 1:
            parts.append("- 语气适中，偶尔使用感叹号")
        else:
            parts.append("- 语气平和，很少使用感叹号")

        if t['question_ratio'] > 3:
            parts.append("- 善用设问，频繁使用问号引导思考")
        elif t['question_ratio'] > 0.5:
            parts.append("- 偶尔使用问号引发读者思考")

        if style_data.get('connectors'):
            top_conn = [c['text'] for c in style_data['connectors'][:5]]
            if top_conn:
                parts.append("\n### 常用连接词")
                parts.append(f"- {', '.join(top_conn)}")

        if style_data.get('sentence_starters'):
            top_start = [s['text'] for s in style_data['sentence_starters'][:5]]
            if top_start:
                parts.append("\n### 常用句首")
                parts.append(f"- {', '.join(top_start)}")

        parts.append("\n请严格按照以上风格指南进行写作。")

        return '\n'.join(parts)
