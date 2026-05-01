import requests
from typing import List, Dict, Any
from datetime import datetime
from bs4 import BeautifulSoup
import re

class HotNewsService:
    
    @staticmethod
    def get_weibo_hot() -> List[Dict[str, Any]]:
        try:
            url = 'https://s.weibo.com/top/summary'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://weibo.com/'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            hot_items = []
            items = soup.select('.td-02')
            for i, item in enumerate(items[:30]):
                title_elem = item.select_one('a')
                hot_elem = item.select_one('span')
                
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '')
                    if link.startswith('//'):
                        link = 'https:' + link
                    elif not link.startswith('http'):
                        link = 'https://s.weibo.com' + link
                    
                    hot_value = 0
                    if hot_elem:
                        hot_text = hot_elem.get_text(strip=True)
                        match = re.search(r'(\d+)', hot_text)
                        if match:
                            hot_value = int(match.group(1))
                    
                    if title and not title.startswith('置顶'):
                        hot_items.append({
                            'rank': i + 1,
                            'title': title,
                            'url': link,
                            'hot_value': hot_value,
                            'source': 'weibo',
                            'category': HotNewsService._categorize_topic(title),
                            'timestamp': datetime.utcnow().isoformat()
                        })
            
            return hot_items
        except Exception as e:
            print(f'Error fetching Weibo hot: {e}')
            return []
    
    @staticmethod
    def get_zhihu_hot() -> List[Dict[str, Any]]:
        try:
            url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            data = response.json()
            
            hot_items = []
            for i, item in enumerate(data.get('data', [])[:30]):
                target = item.get('target', {})
                hot_value = item.get('detail_text', '')
                
                match = re.search(r'(\d+)', str(hot_value))
                hot_num = int(match.group(1)) if match else 0
                
                hot_items.append({
                    'rank': i + 1,
                    'title': target.get('title', '') or target.get('excerpt', ''),
                    'url': f"https://www.zhihu.com/question/{target.get('id', '')}" if target.get('id') else '',
                    'hot_value': hot_num,
                    'source': 'zhihu',
                    'category': HotNewsService._categorize_topic(target.get('title', '')),
                    'excerpt': target.get('excerpt', ''),
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            return hot_items
        except Exception as e:
            print(f'Error fetching Zhihu hot: {e}')
            return []
    
    @staticmethod
    def get_bilibili_hot() -> List[Dict[str, Any]]:
        try:
            url = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bilibili.com/'
            }
            response = requests.get(url, headers=headers, timeout=10)
            data = response.json()
            
            hot_items = []
            for i, item in enumerate(data.get('data', {}).get('list', [])[:30]):
                stat = item.get('stat', {})
                hot_items.append({
                    'rank': i + 1,
                    'title': item.get('title', ''),
                    'url': f"https://www.bilibili.com/video/{item.get('bvid', '')}",
                    'hot_value': stat.get('view', 0),
                    'source': 'bilibili',
                    'category': HotNewsService._categorize_topic(item.get('title', '')),
                    'cover': item.get('pic', ''),
                    'author': item.get('owner', {}).get('name', ''),
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            return hot_items
        except Exception as e:
            print(f'Error fetching Bilibili hot: {e}')
            return []
    
    @staticmethod
    def get_toutiao_hot() -> List[Dict[str, Any]]:
        try:
            url = 'https://www.toutiao.com/hot-event/hot-board/'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            hot_items = []
            items = soup.select('.hot-event-item')
            for i, item in enumerate(items[:30]):
                title_elem = item.select_one('.hot-event-title')
                hot_elem = item.select_one('.hot-event-level')
                
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    hot_text = hot_elem.get_text(strip=True) if hot_elem else ''
                    
                    match = re.search(r'(\d+)', hot_text)
                    hot_num = int(match.group(1)) if match else 0
                    
                    hot_items.append({
                        'rank': i + 1,
                        'title': title,
                        'url': '',
                        'hot_value': hot_num,
                        'source': 'toutiao',
                        'category': HotNewsService._categorize_topic(title),
                        'timestamp': datetime.utcnow().isoformat()
                    })
            
            return hot_items
        except Exception as e:
            print(f'Error fetching Toutiao hot: {e}')
            return []
    
    @staticmethod
    def _categorize_topic(title: str) -> str:
        categories = {
            '科技': ['科技', 'AI', '人工智能', 'ChatGPT', '大模型', '芯片', '5G', '互联网', '程序员', '代码', '算法', '编程'],
            '娱乐': ['娱乐', '明星', '电影', '电视剧', '综艺', '音乐', '演唱会', '粉丝', '娱乐圈'],
            '财经': ['财经', '股票', '基金', '投资', '理财', '银行', '经济', '股市', '牛市', '熊市'],
            '体育': ['体育', '足球', '篮球', 'NBA', '世界杯', '奥运会', '运动员', '比赛'],
            '时政': ['政府', '政策', '两会', '习近平', '李强', '国务院', '中央'],
            '社会': ['社会', '新闻', '事件', '事故', '调查', '警方', '法院'],
            '教育': ['教育', '学校', '学生', '高考', '考研', '留学', '教师', '大学'],
            '健康': ['健康', '医疗', '医院', '医生', '药品', '疫苗', '疾病', '新冠'],
            '游戏': ['游戏', '电竞', '王者荣耀', '原神', '英雄联盟', 'LOL', 'Steam'],
            '美食': ['美食', '餐厅', '做菜', '食谱', '火锅', '烧烤', '奶茶'],
            '旅游': ['旅游', '旅行', '景点', '酒店', '机票', '度假'],
            '汽车': ['汽车', '新能源', '特斯拉', '比亚迪', '电动车', 'SUV']
        }
        
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in title:
                    return category
        
        return '其他'
    
    @staticmethod
    def get_all_hot(sources: List[str] = None) -> Dict[str, Any]:
        if sources is None:
            sources = ['weibo', 'zhihu', 'bilibili']
        
        all_hot = {}
        
        if 'weibo' in sources:
            all_hot['weibo'] = HotNewsService.get_weibo_hot()
        
        if 'zhihu' in sources:
            all_hot['zhihu'] = HotNewsService.get_zhihu_hot()
        
        if 'bilibili' in sources:
            all_hot['bilibili'] = HotNewsService.get_bilibili_hot()
        
        if 'toutiao' in sources:
            all_hot['toutiao'] = HotNewsService.get_toutiao_hot()
        
        merged = []
        for source, items in all_hot.items():
            for item in items:
                merged.append(item)
        
        merged.sort(key=lambda x: x.get('hot_value', 0), reverse=True)
        
        categories = {}
        for item in merged:
            cat = item.get('category', '其他')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(item)
        
        trending_keywords = HotNewsService._extract_trending_keywords(merged[:50])
        
        return {
            'sources': all_hot,
            'merged': merged,
            'by_category': categories,
            'trending_keywords': trending_keywords,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def _extract_trending_keywords(items: List[Dict], top_n: int = 20) -> List[Dict[str, Any]]:
        keyword_freq = {}
        
        for item in items:
            title = item.get('title', '')
            words = re.findall(r'[\u4e00-\u9fa5]{2,}', title)
            for word in words:
                if len(word) >= 2:
                    keyword_freq[word] = keyword_freq.get(word, 0) + 1
        
        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        
        return [{'keyword': kw, 'count': count} for kw, count in sorted_keywords[:top_n]]
    
    @staticmethod
    def analyze_trend(keyword: str) -> Dict[str, Any]:
        all_hot = HotNewsService.get_all_hot()
        merged = all_hot.get('merged', [])
        
        mentions = []
        for item in merged:
            if keyword in item.get('title', ''):
                mentions.append(item)
        
        sources = {}
        for item in mentions:
            src = item.get('source')
            if src:
                sources[src] = sources.get(src, 0) + 1
        
        categories = {}
        for item in mentions:
            cat = item.get('category', '其他')
            if cat:
                categories[cat] = categories.get(cat, 0) + 1
        
        avg_hot = 0
        if mentions:
            avg_hot = sum(item.get('hot_value', 0) for item in mentions) / len(mentions)
        
        return {
            'keyword': keyword,
            'mention_count': len(mentions),
            'average_hot_value': avg_hot,
            'sources': sources,
            'categories': categories,
            'related_items': mentions[:10],
            'trend_score': min(100, len(mentions) * 10 + avg_hot / 1000),
            'timestamp': datetime.utcnow().isoformat()
        }
