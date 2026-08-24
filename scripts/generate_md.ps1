$data = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\complete_wiki_dataset.json" -Raw -Encoding utf8 | ConvertFrom-Json

$md = @"
# 《一九八四》 (Nineteen Eighty-Four) - Wiki 完整字段内容与资源清单

> 来源页面: [$($data.book.source_url)]($($data.book.source_url))  
> 提取时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
> 数据状态: 全部字段、知识图谱、时间线、故事流、图片资源均已完整抓取与本地化。

---

## 目录
1. [书籍基础元数据 (Book Metadata)](#1-书籍基础元数据-book-metadata)
2. [文章核心内容 (Core Article Content)](#2-文章核心内容-core-article-content)
3. [作者信息 (About the Author)](#3-作者信息-about-the-author)
4. [故事流模块 (StoryFlow)](#4-故事流模块-storyflow)
5. [知识图谱分类与实体 (Knowledge Graph Entities & Topologies)](#5-知识图谱分类与实体-knowledge-graph-entities--topologies)
6. [完整剧情时间线 (Complete Storylines / 89 Events)](#6-完整剧情时间线-complete-storylines--89-events)
7. [资源与图片清单 (Media & Assets)](#7-资源与图片清单-media--assets)

---

## 1. 书籍基础元数据 (Book Metadata)

| 字段 | 值 |
| :--- | :--- |
| **英文书名** | $($data.book.title) |
| **中文书名** | $($data.book.title_zh) |
| **作者** | $($data.book.author) |
| **出版年份** | $($data.book.published_year) |
| **唯一文档 ID** | `$($data.book.id)` |
| **封面图远程路径** | `$($data.book.cover_image)` |
| **封面图本地路径** | `$($data.book.local_cover_image)` |
| **在线阅读链接** | $($data.book.read_url) |

---

## 2. 文章核心内容 (Core Article Content)

### 2.1 概览 (Overview)
$($data.article.overview.content)

### 2.2 情节梗概 (Plot)
$(($data.article.plot.paragraphs) -join "`n`n")

### 2.3 核心主题 (Themes)
$($data.article.themes.content)

### 2.4 时代背景与文学遗产 (Background and Legacy)
$(($data.article.background_and_legacy.paragraphs) -join "`n`n")

---

## 3. 作者信息 (About the Author)

**姓名**: $($data.author.name) (原名: $($data.author.real_name))  
**生卒年月**: $($data.author.birth) - $($data.author.death)

"@

foreach ($sec in $data.author.sections) {
    $md += "`n### 3.$($data.author.sections.IndexOf($sec)+1) $($sec.title)`n$($sec.content)`n"
}

$md += @"

---

## 4. 故事流模块 (StoryFlow)

共有 $($data.storyflows.Count) 个精选故事流主题卡片：

"@

foreach ($sf in $data.storyflows) {
    $md += @"
### 4.$($data.storyflows.IndexOf($sf)+1) $($sf.title)
- **ID**: `$($sf.id)`
- **链接**: `$($sf.link)`
- **图片路径**: `$($sf.local_image)` (远程: `$($sf.image)`)
- **简介描述**: $($sf.description)

"@
}

$md += @"
---

## 5. 知识图谱分类与实体 (Knowledge Graph Entities & Topologies)

知识图谱包含 **12 个大类**，共计超过 **200+ 节点关系网**。

### 5.1 分类概览与统计
| 分类名称 (Category) | 包含实体数 | 说明 |
| :--- | :---: | :--- |
| **Character** (人物) | 18 | 温斯顿、茱莉亚、奥布莱恩、老大哥、果尔德施坦因、塞姆等 |
| **Location** (地点) | 17 | 大洋国、真理部、友爱部、和平部、富裕部、101室、查灵顿古董店等 |
| **Organization** (组织) | 10 | 思想警察、少年侦察队、内党、外党、兄弟会、反性青年同盟等 |
| **Object** (物品) | 15 | 秘密日记本、红珊瑚玻璃镇纸、电幕、话写机、果尔德施坦因禁书、杜松子酒等 |
| **Creature** (生物) | 1 | 巨鼠 (温斯顿内心的终极恐惧) |
| **Event** (重要事件) | 16 | 动笔写日记、两分钟仇恨、查灵顿楼上密会、被捕、101室酷刑、彻底屈服等 |
| **Action** (典型行为) | 4 | 思想罪 (Thoughtcrime)、双重思想 (Doublethink)、脸罪 (Facecrime)、鸭话 (Duckspeak) |
| **Concept** (核心概念) | 17 | 寡头集体主义、篡改历史、现实控制、非人 (Unperson)、永久战争等 |
| **Rule** (极权规则与口号) | 28 | 战争即和平、自由即奴役、无知即力量、2+2=5、控制过去者控制未来等 |
| **Time** (时间节点) | 3 | 1984年、1984年4月4日清晨、1984年4月至1985年 |
| **State** (超级大国) | 3 | 大洋国 (Oceania)、欧亚国 (Eurasia)、东亚国 (Eastasia) |
| **Expression** (新话词汇/表达) | 17 | Ingsoc、Newspeak、Doublethink、Memory Hole、Goodthinker、Prolefeed 等 |

---

## 6. 完整剧情时间线 (Complete Storylines / 89 Events)

按故事发展时间顺序梳理的 **全部 89 个事件节点**：

| 序号 | 发生时间 (Date/Time) | 事件标题 (Title) | 事件摘要 (Description) | 缩略图文件 |
| :---: | :--- | :--- | :--- | :--- |
"@

foreach ($event in $data.storylines) {
    $imgFile = [System.IO.Path]::GetFileName($event.image_url.Split('?')[0])
    $md += "`n| $($event.index) | $($event.date) | **$($event.title)** | $($event.description) | `$imgFile` |"
}

$md += @"


---

## 7. 资源与图片清单 (Media & Assets)

所有资源均已分类保存在本地项目目录中：
- 结构化 JSON 数据: `data/`
  - `book_metadata.json`: 书籍基础字段
  - `overview_and_plot.json`: 完整概览、梗概、主题、背景正文
  - `author.json`: 乔治·奥威尔生平传记
  - `storyflows.json`: 故事流导读卡片
  - `knowledge_graph.json`: 12 个分类的全部图谱拓扑、节点及关联
  - `storylines.json`: 89 个故事时间线节点
  - `complete_wiki_dataset.json`: 全量统一主数据库
- 图像与多媒体: `assets/images/` (共包含 240+ 张图谱人物/地点/事件/时间线插图高清素材)

"@

Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\Nineteen_Eighty_Four_Wiki_Content.md" -Value $md -Encoding utf8
Write-Output "Markdown file generated successfully! Total length: $($md.Length) chars"
