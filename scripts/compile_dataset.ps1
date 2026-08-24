# Read the rsc payload and html
$html = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\raw_page.html" -Raw -Encoding utf8
$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

# 1. Book Metadata
$bookMeta = @{
    id = "book-doc-books-001-1984-4b9fbb7c4955"
    title = "Nineteen Eighty-Four"
    title_zh = "一九八四"
    author = "George Orwell"
    published_year = 1949
    cover_image = "/wiki-file/book-doc-books-001-1984-4b9fbb7c4955/images/book-doc-books-001-1984-4b9fbb7c4955-cover.jpg"
    local_cover_image = "./assets/images/book-doc-books-001-1984-4b9fbb7c4955-cover.jpg"
    read_url = "https://app.readifyai.com"
    source_url = "https://readifyai.com/books/Nineteen%20Eighty-Four"
}

# 2. Main Article Sections
$articleSections = @{
    overview = @{
        title = "Overview"
        content = "Nineteen Eighty-Four is a dystopian novel by the English writer George Orwell, first published in London by Secker & Warburg on 8 June 1949. It was Orwell’s ninth and final completed book. Set in a terrifying future imagined from the late 1940s, the novel describes a world in which a handful of totalitarian superpowers are locked in permanent war, and where every citizen is subjected to omnipresent surveillance, ideological indoctrination, and the systematic manipulation of truth. The book is often grouped with Aldous Huxley’s Brave New World and Yevgeny Zamyatin’s We as one of the founding classics of the dystopian genre, and it has become one of the most influential English-language novels of the twentieth century."
    }
    plot = @{
        title = "Plot"
        paragraphs = @(
            "The world of the novel is divided into three great powers: Oceania, Eurasia, and Eastasia. The story takes place in Oceania, a superpower that includes Britain, now known as Airstrip One. Oceania is ruled by a single Party, whose supreme leader is the godlike Big Brother. The Party controls every aspect of public and private life through the Thought Police, two-way television screens called telescreens, and a network of informers. Society is divided into the inner Party, the outer Party, and the proles, the working class. The Party’s ideology is known as Ingsoc, a Newspeak abbreviation for English Socialism. Government is organized into four ministries, each with a deliberately misleading name: the Ministry of Truth, which rewrites history; the Ministry of Peace, which wages war; the Ministry of Love, which carries out torture and executions; and the Ministry of Plenty, which manufactures scarcity.",
            "The protagonist, Winston Smith, is an outer Party member working at the Ministry of Truth. His job is to alter old newspapers and documents so that the records always match the Party’s current lies. Privately, Winston has begun to doubt the Party. He starts a secret diary, buys a piece of forbidden paper, and commits the crime of thoughtcrime. He enters a clandestine relationship with Julia, a young woman who despises the Party in a more personal, hedonistic way. Through a book seller, they come into contact with O’Brien, a senior Party member who seems to oppose the system. O’Brien gives them access to the legendary Book, a forbidden text that may explain the true nature of the Party’s power. However, O’Brien is in fact a loyal servant of the Thought Police. Winston and Julia are arrested. Winston is taken to the Ministry of Love, where he is tortured brutally until his mind and body are broken. In the culminating scene, he is taken to Room 101, where every prisoner is confronted by the thing they fear most. For Winston, that is rats. He begs them to attack Julia instead, betraying her completely. The final pages show Winston, now cured, sitting in a café and feeling that he loves Big Brother."
        )
    }
    themes = @{
        title = "Themes"
        content = "The novel is a powerful warning against totalitarianism. It explores how a government can use relentless surveillance, physical terror, and psychological manipulation to destroy individual freedom and human dignity. Orwell invented a now-standard vocabulary for these mechanisms. Newspeak is a deliberately reduced language designed to make unorthodox thought impossible; its vocabulary is trimmed every year to remove words that might stir rebellion. Doublethink is the ability to hold two contradictory beliefs at once and accept both, a mental discipline demanded of every Party member. Telescreens are constant monitors that cannot be switched off. Big Brother became shorthand for the supreme leader who watches over every citizen. The Party’s slogan—War is Peace, Freedom is Slavery, Ignorance is Strength—expresses the perversion of language and logic on which its power rests. The Ministry of Truth shows how the rewriting of history is central to totalitarian rule: if the past can be erased and recreated, then the present and future can be controlled as well. At a deeper level, the novel asks whether love, truth, and the desire for freedom can survive in a world that has turned every one of those values upside down."
    }
    background_and_legacy = @{
        title = "Background and Legacy"
        paragraphs = @(
            "Orwell lived through the rise of Hitler and Stalin. He fought alongside the Republicans in the Spanish Civil War, an experience that convinced him of the danger of communist totalitarianism and shaped his political conscience. He wrote Nineteen Eighty-Four partly as a response to the totalitarian systems he saw taking shape, and partly as a warning that the social-democratic world could drift into similar oppression. There are echoes of Stalinist Russia and Nazi Germany in the Party’s techniques, but Orwell was careful to make his dystopia a general model rather than a portrait of any single state.",
            "Published in the early years of the Cold War, the book rapidly became a cultural milestone. It gave the English language such lasting terms as Big Brother, Newspeak, doublethink, and thoughtcrime. It has been translated into dozens of languages and has sold tens of millions of copies. Many later dystopian novels, films, and television series draw directly or indirectly on Orwell’s world. With the rise of digital surveillance, fake news, and political manipulation of information, Nineteen Eighty-Four continues to be read as a live warning rather than a historical curiosity. Its status as a classic of English literature, and as a mirror held up to power, remains undisputed."
        )
    }
}

# 3. Author Section
$author = @{
    name = "George Orwell"
    real_name = "Eric Arthur Blair"
    birth = "25 June 1903 (Motihari, Bengal Presidency, British India)"
    death = "21 January 1950 (London, United Kingdom, aged 46)"
    sections = @(
        @{
            title = "Life"
            content = "George Orwell was the pen name of Eric Arthur Blair, born on 25 June 1903 in Motihari in the Bengal Presidency of British India, now in Bihar, India. His father worked in the Opium Department of the Indian Civil Service. A year after his birth, his mother took Eric and his siblings to England, where he grew up and later won a scholarship to Eton College. After leaving Eton in the early 1920s, he did not have the funds to continue to university, so he joined the Indian Imperial Police in Burma and served there for about five years. The experience gave him a painful close-up view of colonial exploitation and deeply shaped his later politics. In 1927, after falling ill, he returned to Europe and decided to become a writer. He lived for a time in poverty among workers and down-and-outs in Paris and London, experiences described vividly in his first nonfiction book, Down and Out in London and Paris. Around 1933 he adopted the pen name George Orwell."
        },
        @{
            title = "Writing Career and Politics"
            content = "Orwell had already published novels such as Burmese Days, but his political awakening was sealed by the Spanish Civil War. In 1936 he married Eileen O’Shaughnessy. In late 1936 he left for Spain, where he fought on the Republican side. He was shot through the throat by a sniper and invalided out. The war convinced him both of the need to resist fascism and of the danger posed by Stalinist communism, which suppressed its own left-wing allies. His book Homage to Catalonia records those experiences with incomparable honesty, although it initially sold poorly.`n`nDuring the Second World War, Orwell worked for the BBC and wrote some of his best-known essays, including essays on language and politics. He also began planning the two works for which he is now most remembered. Animal Farm is a political fable about a group of farm animals who overthrow their human master, only to be enslaved by their own pigs; it is a devastating critique of Stalinism and of the betrayal of revolutionary ideals. Nineteen Eighty-Four carried the same warning much further, imagining a technologically advanced totalitarian state where truth itself is a weapon. Completed as Orwell’s health was failing, it became his final book."
        },
        @{
            title = "Death and Reputation"
            content = "George Orwell died in London on 21 January 1950, aged 46, from tuberculosis. He survived just long enough to see at least some of the recognition his work would bring. In the decades since, his reputation has grown enormously. He is now regarded as one of the most influential British writers and political commentators of the twentieth century. Animal Farm and Nineteen Eighty-Four have sold tens of millions of copies and are read in schools around the world. Words such as Big Brother, Newspeak, doublethink, and Orwellian have become part of the global political vocabulary. Orwell’s commitment to plain language, honesty, and democratic socialism remains an enduring inspiration for writers and readers who believe that words should be used to speak truth to power."
        }
    )
}

# 4. StoryFlows
$storyflows = @(
    @{
        id = "story-flow-doc-books-001-1984-1-87b0ec8f36ec"
        title = "Winston Smith's Rebellion and Fall"
        description = "Traces Winston's journey from the first illegal diary entry to his total submission in the Ministry of Love."
        image = "/wiki-file/book-doc-books-001-1984-4b9fbb7c4955/images/story-flow-doc-books-001-1984-1-87b0ec8f36ec.jpg"
        local_image = "./assets/images/story-flow-doc-books-001-1984-1-87b0ec8f36ec.jpg"
        link = "/books/Nineteen%20Eighty-Four/storyflow/story-flow-doc-books-001-1984-1-87b0ec8f36ec"
    },
    @{
        id = "story-flow-doc-books-001-1984-2-1f158cedb3a4"
        title = "The Brotherhood Trap"
        description = "Follows the thread in which O'Brien masquerades as a leader of the underground and lures Winston into a false dream of resistance."
        image = "/wiki-file/book-doc-books-001-1984-4b9fbb7c4955/images/story-flow-doc-books-001-1984-2-1f158cedb3a4.jpg"
        local_image = "./assets/images/story-flow-doc-books-001-1984-2-1f158cedb3a4.jpg"
        link = "/books/Nineteen%20Eighty-Four/storyflow/story-flow-doc-books-001-1984-2-1f158cedb3a4"
    },
    @{
        id = "story-flow-doc-books-001-1984-3-c77bef829093"
        title = "The Ministry of Truth's Falsification Machine"
        description = "Shows how the Records Department continuously rewrites the past and manufactures lies, and how Winston becomes both a worker and a victim of that system."
        image = "/wiki-file/book-doc-books-001-1984-4b9fbb7c4955/images/story-flow-doc-books-001-1984-3-c77bef829093.jpg"
        local_image = "./assets/images/story-flow-doc-books-001-1984-3-c77bef829093.jpg"
        link = "/books/Nineteen%20Eighty-Four/storyflow/story-flow-doc-books-001-1984-3-c77bef829093"
    }
)

# 5. Load 12 Topologies and Master Knowledge Graph
$categoriesList = @("Characters", "Locations", "Organizations", "Objects", "Creatures", "Events", "Actions", "Concepts", "Rules", "Time", "States", "Expressions")
$knowledgeGraph = @{
    categories = @()
    subgraphs = @{}
    all_nodes = @{}
    all_edges = @()
}

for ($i = 1; $i -le 12; $i++) {
    $path = "c:\Users\marks\OneDrive\桌面\wiki\topology_$i.json"
    if (Test-Path $path) {
        $catName = $categoriesList[$i-1]
        $nodes = Get-Content -Path $path -Raw -Encoding utf8 | ConvertFrom-Json
        $knowledgeGraph.subgraphs[$catName] = $nodes
        $knowledgeGraph.categories += @{
            id = $catName.ToLower()
            name = $catName
            count = $nodes.Count
        }
        
        foreach ($node in $nodes) {
            if (-not $knowledgeGraph.all_nodes.ContainsKey($node.id)) {
                $knowledgeGraph.all_nodes[$node.id] = $node
            }
            if ($node.targets) {
                foreach ($target in $node.targets) {
                    $edgeId = "$($node.id)->$($target)"
                    $knowledgeGraph.all_edges += @{
                        source = $node.id
                        target = $target
                        sourceLabel = $node.label
                        type = $node.type
                    }
                }
            }
        }
    }
}

# 6. Load Storylines / Timeline Events
$timelineData = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\timeline_extracted.json" -Raw -Encoding utf8 | ConvertFrom-Json
$storylines = @()
$idx = 1
foreach ($item in $timelineData) {
    $imgUrl = ""
    if ($item.image -match "url\((.*?)\)") {
        $imgUrl = $matches[1]
    } else {
        $imgUrl = $item.image
    }
    $localImg = ""
    if ($imgUrl) {
        $fileName = [System.IO.Path]::GetFileName($imgUrl.Split('?')[0])
        $localImg = "./assets/images/$fileName"
    }
    
    $storylines += @{
        index = $idx
        date = $item.date
        title = $item.title
        description = $item.description
        image_url = $imgUrl
        local_image = $localImg
    }
    $idx++
}

# Save individual JSON files
$bookMeta | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\book_metadata.json" -Encoding utf8
$articleSections | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\overview_and_plot.json" -Encoding utf8
$author | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\author.json" -Encoding utf8
$storyflows | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows.json" -Encoding utf8
$knowledgeGraph | ConvertTo-Json -Depth 10 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\knowledge_graph.json" -Encoding utf8
$storylines | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\storylines.json" -Encoding utf8

# Complete unified dataset
$completeDataset = @{
    book = $bookMeta
    article = $articleSections
    author = $author
    storyflows = $storyflows
    knowledge_graph = $knowledgeGraph
    storylines = $storylines
}
$completeDataset | ConvertTo-Json -Depth 10 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\complete_wiki_dataset.json" -Encoding utf8

Write-Output "Successfully compiled all JSON datasets!"
