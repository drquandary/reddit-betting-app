// ===== CONFIGURATION =====
// Set this to your backend URL if using WebSearch backend
// Leave as null to use RSS/Google News fallback
const API_BASE_URL = 'http://localhost:5001'; // WebSearch backend enabled - searches Google News

// ===== STATE MANAGEMENT =====
const AppState = {
    currentScreen: 'loading',
    currentTab: 'feed',
    userPreferences: {
        interests: [],
        likedArticles: [],
        dislikedArticles: [],
        savedArticles: [],
        readArticles: [],
        topicScores: {},
        apiKey: 'dummy_key',
        autoSummarize: false,
        personalization: true,
        darkMode: false
    },
    articles: [],
    currentCardIndex: 0,
    cardHistory: [], // Track swiped cards for undo
    stats: {
        articlesRead: 0,
        streak: 0,
        lastReadDate: null
    }
};

// ===== RSS FEEDS BY TOPIC =====
const RSS_FEEDS = {
    technology: [
        'https://www.theverge.com/rss/index.xml',
        'https://techcrunch.com/feed/',
        'https://www.wired.com/feed/rss'
    ],
    science: [
        'https://www.sciencedaily.com/rss/all.xml',
        'https://www.scientificamerican.com/feed/',
        'https://phys.org/rss-feed/'
    ],
    ai: [
        'https://www.artificialintelligence-news.com/feed/',
        'https://www.marktechpost.com/feed/'
    ],
    business: [
        'https://feeds.bloomberg.com/markets/news.rss',
        'https://www.economist.com/business/rss.xml'
    ],
    climate: [
        'https://www.climatecentral.org/feed',
        'https://insideclimatenews.org/feed/'
    ],
    health: [
        'https://www.medicalnewstoday.com/rss/news.xml',
        'https://www.sciencedaily.com/rss/health_medicine.xml'
    ],
    politics: [
        'https://www.politico.com/rss/politics08.xml',
        'https://thehill.com/feed/'
    ],
    world: [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml'
    ]
};

// ===== SAMPLE NEWS DATA (Fallback) =====
// Used as fallback if RSS feeds fail
const SAMPLE_ARTICLES = [
    {
        id: 1,
        title: "AI Breakthrough: New Language Model Achieves Human-Level Reasoning",
        source: "TechNews",
        topic: "ai",
        summary: "Researchers have developed a new AI model that demonstrates unprecedented reasoning capabilities, potentially marking a significant milestone in artificial intelligence development.",
        content: "In a groundbreaking development, researchers at leading AI labs have unveiled a new language model that demonstrates human-level reasoning across various domains. The model, which has been trained on diverse datasets spanning scientific literature, technical documentation, and real-world problem-solving scenarios, shows remarkable capabilities in understanding context, drawing inferences, and providing nuanced responses to complex queries.\n\nThe research team conducted extensive testing across multiple benchmarks, including mathematical reasoning, logical puzzles, and natural language understanding tasks. In each category, the model performed on par with or exceeded human baseline performance. This achievement represents years of research into neural architecture, training methodologies, and data curation.\n\nExperts in the field have praised the advancement while noting important considerations around responsible deployment. Dr. Sarah Chen, a leading AI ethics researcher, commented: 'This represents a significant technical achievement, but it also underscores the importance of ensuring these powerful systems are developed with proper safeguards and ethical guidelines.'\n\nThe implications for various industries are substantial, with potential applications ranging from advanced medical diagnosis support to complex engineering problem-solving. However, researchers emphasize that continued vigilance and interdisciplinary collaboration will be essential as these technologies mature.",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=250&fit=crop",
        readTime: 5,
        publishedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: "Climate Scientists Discover Unexpected Ocean Current Changes",
        source: "Science Daily",
        topic: "climate",
        summary: "New research reveals significant shifts in ocean currents that could impact global weather patterns and marine ecosystems in unprecedented ways.",
        content: "A team of climate scientists has documented unexpected changes in major ocean currents that regulate global weather patterns and marine ecosystems. Using advanced satellite monitoring and deep-ocean sensors deployed over the past decade, researchers have identified measurable alterations in the Atlantic Meridional Overturning Circulation (AMOC), a critical component of Earth's climate system.\n\nThe findings, published in a leading scientific journal, show that these changes are occurring faster than previously predicted by climate models. Dr. James Morrison, lead author of the study, explains: 'We're seeing shifts that we didn't expect to observe for another 20-30 years. This accelerated timeline has significant implications for coastal communities, marine biodiversity, and global weather patterns.'\n\nThe research team analyzed data from thousands of measurement points across the Atlantic Ocean, combining satellite observations with direct measurements from autonomous underwater vehicles. Their analysis reveals that warming ocean temperatures are affecting the density-driven circulation that moves water between the tropics and polar regions.\n\nThe potential impacts are far-reaching. Changes in these currents could affect rainfall patterns in regions home to billions of people, alter the distribution of marine species, and influence the rate of heat absorption by the oceans. Scientists are calling for increased monitoring efforts and emphasize the urgency of addressing climate change through coordinated global action.",
        image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=250&fit=crop",
        readTime: 7,
        publishedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 3,
        title: "Major Tech Companies Announce New Privacy Standards",
        source: "Tech Weekly",
        topic: "technology",
        summary: "Leading technology firms have agreed to implement stricter privacy protections and data handling practices in response to growing consumer concerns.",
        content: "In a coordinated announcement, several major technology companies revealed new privacy initiatives designed to give users greater control over their personal data. The joint commitment includes enhanced transparency about data collection practices, simplified privacy controls, and new tools for users to understand and manage how their information is used.\n\nThe announcement comes after years of increasing public concern about data privacy and following regulatory pressure from governments worldwide. Companies participating in the initiative have agreed to standardize privacy settings across platforms, making it easier for users to make informed decisions about their data.\n\nKey features of the new standards include opt-in consent for data sharing, regular privacy audits by independent third parties, and the implementation of privacy-by-design principles in product development. Users will also gain access to comprehensive dashboards showing what data has been collected and how it's being used.\n\nConsumer advocacy groups have cautiously welcomed the announcement while emphasizing the need for ongoing oversight. 'This is a positive step, but the proof will be in the implementation,' noted privacy advocate Maria Rodriguez. 'We'll be monitoring closely to ensure these commitments translate into meaningful protections for users.'",
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=250&fit=crop",
        readTime: 4,
        publishedAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: 4,
        title: "Breakthrough in Quantum Computing Brings Practical Applications Closer",
        source: "Science Today",
        topic: "science",
        summary: "Scientists have achieved a major milestone in quantum error correction, bringing practical quantum computers closer to reality.",
        content: "Researchers have made significant progress in solving one of quantum computing's biggest challenges: error correction. A team at a leading research institution has demonstrated a new approach that dramatically reduces the error rate in quantum calculations, potentially paving the way for practical quantum computers that can outperform classical systems in real-world applications.\n\nQuantum computers harness the principles of quantum mechanics to perform certain calculations exponentially faster than traditional computers. However, quantum bits (qubits) are extremely fragile and prone to errors from environmental interference. The new error correction technique uses a novel arrangement of qubits that can detect and correct errors without destroying the quantum state.\n\nIn laboratory tests, the system maintained quantum coherence for significantly longer periods than previous methods, allowing for more complex calculations to be performed reliably. Professor Elena Kowalski, who led the research, explained: 'This breakthrough addresses one of the fundamental barriers to scaling up quantum computers. We're now able to perform calculations that were previously impossible due to error accumulation.'\n\nThe implications extend across multiple fields, from drug discovery and materials science to cryptography and artificial intelligence. While practical quantum computers for everyday use are still years away, this advancement represents a crucial step toward making quantum computing a reality.",
        image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=250&fit=crop",
        readTime: 6,
        publishedAt: new Date(Date.now() - 259200000).toISOString()
    },
    {
        id: 5,
        title: "Global Markets React to New Economic Policy Announcements",
        source: "Financial Times",
        topic: "business",
        summary: "Stock markets worldwide experienced significant movements following announcements of new economic policies by major central banks.",
        content: "Global financial markets showed strong reactions to coordinated policy announcements from major central banks, with indices experiencing significant volatility as investors digested the implications of new monetary policy directions. The Federal Reserve, European Central Bank, and Bank of Japan simultaneously announced adjustments to their respective policy frameworks, marking a significant shift in the global economic landscape.\n\nMarket analysts noted that while the immediate reaction was mixed, the long-term implications suggest a period of adjustment as economies navigate changing interest rate environments. Stock indices in major markets moved sharply in early trading before stabilizing as institutional investors reassessed their positions.\n\nThe policy changes reflect central banks' efforts to balance multiple objectives: managing inflation, supporting employment, and maintaining financial stability. Economists are divided on the potential impacts, with some arguing that the coordinated approach demonstrates strong international cooperation, while others express concern about potential unintended consequences.\n\nCurrency markets also showed significant movement, with the dollar strengthening against major currencies before settling into a new trading range. Commodity prices responded to the news as well, with gold and oil experiencing notable price swings. Financial advisors are counseling clients to maintain diversified portfolios and take a long-term perspective during this period of policy transition.",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=250&fit=crop",
        readTime: 5,
        publishedAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: 6,
        title: "Revolutionary Battery Technology Promises 10x Faster Charging",
        source: "Innovation Daily",
        topic: "technology",
        summary: "Engineers have developed a new battery technology that could enable electric vehicles to charge in minutes rather than hours.",
        content: "A team of engineers has created a revolutionary battery design that significantly improves charging speed while maintaining energy density and longevity. The breakthrough, announced at a major technology conference, could transform the electric vehicle industry by addressing one of the primary barriers to widespread EV adoption: charging time.\n\nThe new battery architecture uses a novel electrode design and advanced materials that allow for much faster ion movement without degrading the battery's internal structure. In laboratory tests, the batteries demonstrated the ability to charge to 80% capacity in less than 10 minutes, compared to 30-60 minutes for current fast-charging systems.\n\nDr. Michael Chang, lead engineer on the project, explained the significance: 'We've essentially solved the trade-off between charging speed and battery life. Our batteries can handle rapid charging cycles without the degradation that plagues current systems. This means an EV could be charged as quickly as filling up a gas tank.'\n\nThe technology is currently undergoing real-world testing in partnership with major automotive manufacturers. If successful, commercial production could begin within three years. Industry experts believe this advancement could be the catalyst that accelerates EV adoption to mass-market levels, particularly for consumers who have been hesitant due to charging concerns.",
        image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&h=250&fit=crop",
        readTime: 5,
        publishedAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: 7,
        title: "New Study Reveals Benefits of Mediterranean Diet on Brain Health",
        source: "Health Journal",
        topic: "health",
        summary: "Long-term research shows that Mediterranean diet patterns are associated with better cognitive function and reduced risk of dementia.",
        content: "A comprehensive study tracking thousands of participants over decades has confirmed substantial cognitive benefits associated with Mediterranean diet patterns. The research, published in a leading medical journal, provides robust evidence that dietary choices significantly impact brain health and the risk of age-related cognitive decline.\n\nThe study followed over 7,000 participants for an average of 12 years, carefully documenting dietary habits and conducting regular cognitive assessments. Participants who most closely adhered to Mediterranean diet principles showed 23% lower risk of developing cognitive impairment compared to those with the least adherence.\n\nThe Mediterranean diet emphasizes plant-based foods, olive oil, fish, and moderate amounts of dairy and wine, while limiting red meat and processed foods. Researchers believe the combination of anti-inflammatory compounds, healthy fats, and antioxidants contributes to the protective effects.\n\nDr. Lisa Thompson, the study's principal investigator, noted: 'These findings add to a growing body of evidence that lifestyle factors, particularly diet, play a crucial role in maintaining cognitive health as we age. The good news is that it's never too late to make beneficial dietary changes.' The research team is now investigating the specific biological mechanisms through which diet influences brain health.",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=250&fit=crop",
        readTime: 4,
        publishedAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
        id: 8,
        title: "Space Agency Announces Plans for Lunar Base Construction",
        source: "Space News",
        topic: "science",
        summary: "International space agencies have unveiled detailed plans for establishing a permanent human presence on the Moon within the next decade.",
        content: "In a historic announcement, space agencies from multiple countries revealed comprehensive plans for constructing the first permanent lunar base. The ambitious international collaboration aims to establish a sustainable human presence on the Moon by 2035, serving as a stepping stone for future deep space exploration.\n\nThe proposed lunar base will be located near the Moon's south pole, where recent discoveries have confirmed the presence of water ice in permanently shadowed craters. This location offers both scientific value and practical resources for sustaining human habitation. The base will initially house crews of 4-6 astronauts for extended missions lasting several months.\n\nThe project represents the largest international space collaboration since the International Space Station, with participating agencies pooling expertise and resources. Key technologies being developed include advanced life support systems, radiation shielding, and in-situ resource utilization systems that can extract oxygen and water from lunar regolith.\n\nMission planners envision the base serving multiple purposes: conducting lunar science, testing technologies for Mars missions, and potentially supporting commercial activities. Dr. Robert Kim, mission architect, explained: 'This isn't just about returning to the Moon – it's about learning to live and work on another world. The lessons we learn here will be invaluable for eventual Mars missions and beyond.'",
        image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&h=250&fit=crop",
        readTime: 6,
        publishedAt: new Date(Date.now() - 604800000).toISOString()
    },
    {
        id: 9,
        title: "AI Ethics Framework Proposed by Global Tech Leaders",
        source: "Tech Ethics",
        topic: "ai",
        summary: "Industry leaders and ethicists have collaborated to propose comprehensive guidelines for responsible AI development and deployment.",
        content: "A coalition of technology leaders, academics, and ethicists has released a detailed framework for responsible AI development, addressing growing concerns about the societal impacts of artificial intelligence. The comprehensive guidelines represent months of collaboration among diverse stakeholders and aim to establish common principles for ethical AI deployment.\n\nThe framework addresses key areas including transparency, accountability, fairness, privacy, and human oversight. It proposes specific mechanisms for auditing AI systems, ensuring diverse representation in development teams, and establishing clear lines of responsibility when AI systems cause harm.\n\nParticularly notable is the emphasis on 'AI impact assessments' that would require organizations to evaluate potential societal consequences before deploying AI systems at scale. The framework also calls for greater public participation in decisions about AI governance and the development of accessible channels for reporting AI-related harms.\n\nDr. Angela Martinez, an AI ethics researcher involved in drafting the framework, commented: 'This represents a significant step toward ensuring AI development serves the public good. However, the real challenge lies in implementation and enforcement. We need both industry commitment and regulatory oversight to make these principles meaningful.'\n\nThe proposal has received mixed reactions, with some praising its comprehensive approach while others argue for stronger enforcement mechanisms. Several governments have indicated interest in incorporating elements of the framework into upcoming AI legislation.",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=250&fit=crop",
        readTime: 7,
        publishedAt: new Date(Date.now() - 691200000).toISOString()
    },
    {
        id: 10,
        title: "Renewable Energy Surpasses Fossil Fuels in Major Economy",
        source: "Energy Report",
        topic: "climate",
        summary: "For the first time, renewable energy sources have generated more electricity than fossil fuels in a major industrial nation.",
        content: "In a historic milestone for clean energy transition, renewable sources including solar and wind have generated more electricity than fossil fuels in a major industrial economy for an entire quarter. The achievement, documented in official energy statistics, marks a symbolic and practical turning point in the global shift away from carbon-intensive power generation.\n\nThe transition was driven by massive investments in renewable infrastructure over the past decade, combined with improving technology efficiency and declining costs. Solar and wind installations have proliferated across the country, supported by favorable policy frameworks and growing public support for clean energy.\n\nEnergy analysts note that this milestone, while significant, represents just one step in a longer journey toward complete decarbonization. Grid storage capabilities, transmission infrastructure, and backup power systems will need continued development to ensure reliability as renewable penetration increases further.\n\nEnvironmental advocates celebrated the achievement while emphasizing the need for accelerated action globally. 'This proves that transitioning to renewable energy is not only possible but economically viable,' stated climate policy expert David Park. 'Other nations now have a clear roadmap to follow. The question is whether we can scale this success fast enough to meet our climate goals.'\n\nThe country's success has sparked renewed interest from other nations seeking to replicate the model, with several announcing ambitious new renewable energy targets.",
        image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&h=250&fit=crop",
        readTime: 5,
        publishedAt: new Date(Date.now() - 777600000).toISOString()
    }
];

// ===== RSS FEED FETCHER =====
class RSSFeedFetcher {
    static async fetchFeed(feedUrl) {
        try {
            // Use rss2json API to handle CORS and parse RSS (free tier, no API key needed for basic use)
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`);
            const data = await response.json();

            if (data.status === 'ok') {
                return data.items;
            }
            return [];
        } catch (error) {
            console.error('RSS fetch error:', error);
            return [];
        }
    }

    static async fetchMultipleFeeds(feedUrls, topic) {
        const allArticles = [];

        for (const feedUrl of feedUrls) {
            const items = await this.fetchFeed(feedUrl);
            items.forEach(item => {
                allArticles.push({
                    id: this.generateId(item.link),
                    title: item.title,
                    source: item.author || this.extractDomain(item.link),
                    topic: topic,
                    summary: this.stripHtml(item.description || item.content || '').substring(0, 200) + '...',
                    content: this.stripHtml(item.content || item.description || ''),
                    image: this.extractImage(item) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=250&fit=crop',
                    readTime: Math.ceil(this.stripHtml(item.content || item.description || '').split(' ').length / 200),
                    publishedAt: item.pubDate || new Date().toISOString(),
                    url: item.link
                });
            });
        }

        return allArticles;
    }

    static async fetchAllTopics(selectedTopics = null) {
        const topics = selectedTopics || Object.keys(RSS_FEEDS);
        const allArticles = [];

        for (const topic of topics) {
            if (RSS_FEEDS[topic]) {
                const articles = await this.fetchMultipleFeeds(RSS_FEEDS[topic], topic);
                allArticles.push(...articles);
            }
        }

        // Shuffle and limit
        return this.shuffleArray(allArticles).slice(0, 50);
    }

    static generateId(url) {
        // Simple hash function for URLs
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    static extractDomain(url) {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        } catch {
            return 'Unknown';
        }
    }

    static stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    static extractImage(item) {
        // Try to extract image from various RSS fields
        if (item.enclosure && item.enclosure.link) {
            return item.enclosure.link;
        }
        if (item.thumbnail) {
            return item.thumbnail;
        }
        // Try to extract from content
        const imgMatch = (item.content || item.description || '').match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            return imgMatch[1];
        }
        return null;
    }

    static shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// ===== CLAUDE API INTEGRATION =====
class ClaudeAPI {
    constructor(apiKey = 'dummy_key') {
        this.apiKey = apiKey || 'dummy_key';
        this.baseURL = 'http://localhost:8081/v1/messages';
    }

    async fetchArticleContent(url) {
        if (!this.apiKey) {
            return null;
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `Please fetch and extract the main article content from this URL: ${url}

Return only the main article text, cleaned of ads, navigation, and other non-content elements. Format it as readable paragraphs.`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.content[0].text;
        } catch (error) {
            console.error('Claude web fetch error:', error);
            return null;
        }
    }

    async generateSummary(articleContent, title) {
        if (!this.apiKey) {
            // Fallback to simple summary
            return `This article discusses "${title}". ${articleContent.substring(0, 150)}...`;
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 200,
                    messages: [{
                        role: 'user',
                        content: `Provide a concise 2-sentence summary of this article:\n\nTitle: ${title}\n\nContent: ${articleContent}`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            return `This article discusses "${title}". ${articleContent.substring(0, 150)}...`;
        }
    }

    async categorizeContent(title, content) {
        if (!this.apiKey) {
            // Fallback to simple categorization
            return { topics: ['general'], sentiment: 'neutral' };
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 100,
                    messages: [{
                        role: 'user',
                        content: `Analyze this article and return ONLY a JSON object with these fields:
{
  "topics": ["topic1", "topic2"],
  "sentiment": "positive/neutral/negative",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Title: ${title}
Content: ${content.substring(0, 500)}`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const text = data.content[0].text;

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { topics: ['general'], sentiment: 'neutral', keywords: [] };
        } catch (error) {
            console.error('Claude API categorization error:', error);
            return { topics: ['general'], sentiment: 'neutral', keywords: [] };
        }
    }

    async analyzePreferences(likedArticles, dislikedArticles) {
        if (!this.apiKey || likedArticles.length === 0) {
            return { suggestedTopics: [], insights: 'Not enough data yet.' };
        }

        try {
            const likedSummary = likedArticles.map(a => `${a.topic}: ${a.title}`).join('\n');
            const dislikedSummary = dislikedArticles.map(a => `${a.topic}: ${a.title}`).join('\n');

            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 150,
                    messages: [{
                        role: 'user',
                        content: `Based on these reading patterns, identify the user's interests and suggest topics they might enjoy:

Liked articles:
${likedSummary}

Disliked articles:
${dislikedSummary}

Return a JSON object with:
{
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "insights": "brief insight about user preferences"
}`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { suggestedTopics: [], insights: 'Keep reading to build your profile!' };
        } catch (error) {
            console.error('Claude API preference analysis error:', error);
            return { suggestedTopics: [], insights: 'Keep reading to build your profile!' };
        }
    }

    parseGoogleNewsXML(xmlText) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                console.error('XML parsing error:', parseError.textContent);
                return [];
            }

            const items = doc.querySelectorAll('item');
            console.log(`📰 Parsed ${items.length} items from Google News XML`);

            return Array.from(items).map(item => {
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
                const source = item.querySelector('source')?.textContent || 'Google News';

                return {
                    id: btoa(link).substring(0, 16),
                    title: title.replace(/ - .+$/, ''), // Remove " - Source" from end
                    content: description,
                    summary: description.substring(0, 200),
                    source: source,
                    topic: 'news',
                    url: link,
                    image: 'https://via.placeholder.com/400x200/6366f1/ffffff?text=News',
                    publishedAt: pubDate
                };
            });
        } catch (error) {
            console.error('Error parsing Google News XML:', error);
            return [];
        }
    }

    async searchWebForArticles(searchTerms, exactEvent) {
        console.log(`🔍 Searching web for: ${searchTerms.join(', ')}`);

        const allArticles = [];

        try {
            // Try WebSearch backend first (if configured)
            if (API_BASE_URL) {
                try {
                    console.log('🌐 Trying WebSearch backend...');
                    const response = await fetch(`${API_BASE_URL}/api/search`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: exactEvent || searchTerms.slice(0, 3).join(' '),
                            max_results: 20
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`✅ WebSearch backend returned ${data.articles.length} articles`);
                        allArticles.push(...data.articles);

                        // Return early if we got good results from WebSearch
                        if (allArticles.length >= 5) {
                            console.log('✅ Using WebSearch backend results');
                            return allArticles;
                        }
                    } else {
                        console.warn(`⚠️ WebSearch backend returned status ${response.status}`);
                    }
                } catch (backendError) {
                    console.warn('⚠️ WebSearch backend not available:', backendError.message);
                    console.log('📰 Falling back to RSS + Google News');
                }
            }

            // Fallback: Fetch fresh RSS feeds from all topics
            console.log('📰 Fetching fresh RSS feeds...');
            const rssArticles = await RSSFeedFetcher.fetchAllTopics();
            console.log(`✅ Fetched ${rssArticles.length} articles from RSS feeds`);
            allArticles.push(...rssArticles);

            // 2. Search Google News RSS via CORS proxy (bypasses browser restrictions)
            const searchQuery = exactEvent || searchTerms.slice(0, 3).join(' ');
            const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;

            // Use CORS proxy to bypass browser restrictions
            const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleNewsUrl)}`;

            try {
                console.log(`🌐 Searching Google News for: "${searchQuery}"`);
                console.log(`   Query URL: ${googleNewsUrl}`);
                console.log(`   Using CORS proxy to bypass restrictions`);

                const response = await fetch(corsProxyUrl);

                if (response.ok) {
                    const xmlText = await response.text();
                    console.log(`✅ Received ${xmlText.length} bytes of XML from Google News`);

                    const googleArticles = this.parseGoogleNewsXML(xmlText);

                    if (googleArticles.length > 0) {
                        console.log(`✅ Found ${googleArticles.length} articles from Google News search`);
                        allArticles.push(...googleArticles);
                    } else {
                        console.warn('⚠️ Google News returned 0 articles after parsing');
                        console.warn('   This usually means no articles exist for this specific search query');
                    }
                } else {
                    console.warn(`⚠️ Google News fetch failed with status ${response.status}`);
                }
            } catch (googleError) {
                console.warn('Google News search failed, continuing with RSS only:', googleError);
                console.warn('Error details:', googleError.message);
            }

            console.log(`✅ Total articles found: ${allArticles.length}`);
            return allArticles;
        } catch (error) {
            console.error('Web search error:', error);
            return allArticles; // Return what we have
        }
    }

    async exploreArticleThemes(article) {
        if (!this.apiKey) {
            console.warn('⚠️ No API key configured - using fallback analysis');
            return {
                specificEntities: [],
                productNames: [],
                companyNames: [],
                exactEvent: '',
                dates: [],
                searchTerms: []
            };
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 500,
                    messages: [{
                        role: 'user',
                        content: `You are analyzing a news article to find VERY SPECIFIC related articles about the SAME event, product, or announcement.

Title: ${article.title}
Content: ${article.content.substring(0, 1500)}

Return a JSON object focusing on the MOST SPECIFIC details. You MUST provide at least 2 specific entities (products, companies, or people/tech) to enable precise matching.

{
  "exactEvent": "precise description of the specific event/announcement (e.g., 'OpenAI GPT-4 Turbo release' not just 'AI model release')",
  "companyNames": ["exact company names mentioned, including subsidiaries - MUST have at least 1 if relevant"],
  "productNames": ["exact product/model names with versions (e.g., 'GPT-4 Turbo', 'iPhone 15 Pro', 'Model S Plaid') - MUST have at least 1 if relevant"],
  "specificEntities": ["specific people names, specific locations, specific technologies with version numbers - be SPECIFIC"],
  "dates": ["specific dates, months, or quarters mentioned"],
  "searchTerms": ["3-5 HIGHLY SPECIFIC search terms that uniquely identify this story - NOT generic topics"]
}

CRITICAL REQUIREMENTS:
1. You MUST extract at least 2 different types of specific entities (e.g., 1 product + 1 company, or 1 company + 1 person)
2. If the article mentions SPECIFIC names, products, or entities, you MUST include them
3. If you cannot find specific entities, indicate this is a general article by returning empty arrays for entities
4. Be as SPECIFIC as possible - include version numbers, exact model names, full product names
5. searchTerms should be SPECIFIC to this article, NOT just the topic name

GOOD Examples:
- exactEvent: "OpenAI announces GPT-4 Turbo with 128K context window"
- productNames: ["GPT-4 Turbo", "ChatGPT Enterprise"]
- companyNames: ["OpenAI", "Microsoft"]
- specificEntities: ["Sam Altman", "128K context window", "JSON mode"]
- searchTerms: ["gpt-4 turbo", "128k context", "openai devday"]

BAD Examples (too generic - DON'T do this):
- exactEvent: "AI company releases new model"
- productNames: ["AI model"]
- companyNames: ["tech company"]
- searchTerms: ["technology", "ai"]`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // VALIDATION: Check if we have at least some specific entities
                const hasProducts = parsed.productNames && parsed.productNames.length > 0;
                const hasCompanies = parsed.companyNames && parsed.companyNames.length > 0;
                const hasEntities = parsed.specificEntities && parsed.specificEntities.length > 0;

                if (!hasProducts && !hasCompanies && !hasEntities) {
                    console.warn('⚠️ Claude returned no specific entities - this article may be too general for specific matching');
                }

                return parsed;
            }

            // Fallback if parsing failed
            console.warn('⚠️ Failed to parse Claude response - returning empty analysis');
            return {
                specificEntities: [],
                productNames: [],
                companyNames: [],
                exactEvent: '',
                dates: [],
                searchTerms: []
            };
        } catch (error) {
            console.error('Claude API theme analysis error:', error);
            return {
                specificEntities: [],
                productNames: [],
                companyNames: [],
                exactEvent: '',
                dates: [],
                searchTerms: []
            };
        }
    }
}

// ===== LOCAL STORAGE =====
class Storage {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Storage save error:', error);
        }
    }

    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    }
}

// ===== PERSONALIZATION ENGINE =====
class PersonalizationEngine {
    static calculateArticleScore(article, userPreferences) {
        if (!userPreferences.personalization) {
            return Math.random(); // Random order if personalization disabled
        }

        let score = 0;

        // Topic interest score
        const topicScore = userPreferences.topicScores[article.topic] || 0;
        score += topicScore * 10;

        // Selected interests boost
        if (userPreferences.interests.includes(article.topic)) {
            score += 5;
        }

        // Recency score
        const daysOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 5 - daysOld); // Prefer recent articles

        // Avoid already read articles
        if (userPreferences.readArticles.includes(article.id)) {
            score -= 20;
        }

        // Randomness factor (prevent echo chamber)
        score += Math.random() * 2;

        return score;
    }

    static rankArticles(articles, userPreferences) {
        return articles
            .map(article => ({
                article,
                score: this.calculateArticleScore(article, userPreferences)
            }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.article);
    }

    static updateTopicScores(userPreferences, article, liked) {
        const topic = article.topic;
        const currentScore = userPreferences.topicScores[topic] || 0;

        // Increase score for liked, decrease for disliked
        const delta = liked ? 0.1 : -0.05;
        userPreferences.topicScores[topic] = Math.max(-1, Math.min(1, currentScore + delta));

        return userPreferences;
    }
}

// ===== CARD SWIPE FUNCTIONALITY =====
class CardSwiper {
    constructor(cardElement, onSwipe) {
        this.card = cardElement;
        this.onSwipe = onSwipe;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;

        this.addSwipeIndicators();
        this.bindEvents();
    }

    addSwipeIndicators() {
        // Add swipe hint overlays if they don't exist
        if (!this.card.querySelector('.swipe-hint-left')) {
            const leftHint = document.createElement('div');
            leftHint.className = 'swipe-hint swipe-hint-left';
            leftHint.textContent = '👎';
            this.card.appendChild(leftHint);

            const rightHint = document.createElement('div');
            rightHint.className = 'swipe-hint swipe-hint-right';
            rightHint.textContent = '❤️';
            this.card.appendChild(rightHint);
        }
    }

    bindEvents() {
        this.card.addEventListener('mousedown', this.handleStart.bind(this));
        this.card.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });

        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });

        document.addEventListener('mouseup', this.handleEnd.bind(this));
        document.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(e) {
        // Don't intercept button clicks
        if (e.target.closest('button')) {
            return;
        }

        e.preventDefault();
        this.isDragging = true;
        this.card.classList.add('swiping');

        const point = e.type.includes('mouse') ? e : e.touches[0];
        this.startX = point.clientX;
        this.startY = point.clientY;
    }

    handleMove(e) {
        if (!this.isDragging) return;

        const point = e.type.includes('mouse') ? e : e.touches[0];
        this.currentX = point.clientX - this.startX;
        this.currentY = point.clientY - this.startY;

        const rotate = this.currentX / 10;
        const opacity = Math.max(0.3, 1 - Math.abs(this.currentX) / 300);

        // Apply transform
        this.card.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotate}deg)`;
        this.card.style.opacity = opacity;

        // Show swipe indicators
        const leftHint = this.card.querySelector('.swipe-hint-left');
        const rightHint = this.card.querySelector('.swipe-hint-right');

        if (leftHint && rightHint) {
            if (this.currentX < -50) {
                // Swiping left - show dislike
                const leftOpacity = Math.min(1, Math.abs(this.currentX) / 150);
                leftHint.style.setProperty('opacity', leftOpacity, 'important');
                rightHint.style.setProperty('opacity', '0', 'important');
            } else if (this.currentX > 50) {
                // Swiping right - show like
                const rightOpacity = Math.min(1, this.currentX / 150);
                rightHint.style.setProperty('opacity', rightOpacity, 'important');
                leftHint.style.setProperty('opacity', '0', 'important');
            } else {
                // Not far enough
                leftHint.style.setProperty('opacity', '0', 'important');
                rightHint.style.setProperty('opacity', '0', 'important');
            }
        }
    }

    handleEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.card.classList.remove('swiping');

        const swipeThreshold = 100;

        // Hide indicators
        const leftHint = this.card.querySelector('.swipe-hint-left');
        const rightHint = this.card.querySelector('.swipe-hint-right');
        if (leftHint) leftHint.style.setProperty('opacity', '0', 'important');
        if (rightHint) rightHint.style.setProperty('opacity', '0', 'important');

        if (Math.abs(this.currentX) > swipeThreshold) {
            const direction = this.currentX > 0 ? 'right' : 'left';
            this.completeSwipe(direction);
        } else {
            // Reset card position
            this.card.style.transform = '';
            this.card.style.opacity = '';
        }
    }

    completeSwipe(direction) {
        this.card.classList.add('removing', `swipe-${direction}`);

        setTimeout(() => {
            this.onSwipe(direction);
        }, 500);
    }

    swipeProgrammatically(direction) {
        this.card.classList.add('removing', `swipe-${direction}`);

        setTimeout(() => {
            this.onSwipe(direction);
        }, 500);
    }
}

// ===== UI CONTROLLER =====
class UIController {
    static showScreen(screenId) {
        console.log('showScreen called with:', screenId);
        const screens = document.querySelectorAll('.screen');
        console.log('Found screens:', screens.length);

        screens.forEach(screen => {
            console.log('Removing active from:', screen.id);
            screen.classList.remove('active');
        });

        const targetScreen = document.getElementById(screenId);
        console.log('Target screen element:', targetScreen);

        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Added active to:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }

        AppState.currentScreen = screenId;
    }

    static switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${tabName}-view`).classList.add('active');

        AppState.currentTab = tabName;

        // Load view-specific content
        if (tabName === 'explore') {
            this.renderExploreView();
        } else if (tabName === 'insights') {
            this.renderInsightsView();
        }
    }

    static createNewsCard(article) {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.dataset.articleId = article.id;

        // Use enhanced summary if available
        const summary = article.aiSummary || article.summary;

        card.innerHTML = `
            <div class="card-top-actions">
                <button class="card-bookmark-btn" data-action="save">🔖</button>
            </div>
            <img src="${article.image}" alt="${article.title}" class="card-image" onerror="this.src='https://via.placeholder.com/600x250/6366f1/ffffff?text=News'">
            <div class="card-content">
                <div class="card-meta">
                    <span class="source-badge">${article.source}</span>
                    <span class="topic-tag">${article.topic}</span>
                    <span class="topic-tag">${article.readTime} min read</span>
                </div>
                <h2 class="card-title">${article.title}</h2>
                ${article.aiSummary ? '<div class="ai-badge">✨ AI Summary</div>' : ''}
                <p class="card-summary">${summary}</p>
            </div>
            <div class="card-footer-actions">
                <button class="card-footer-btn dislike-btn" data-action="skip">
                    <span class="btn-icon">👎</span>
                    <span class="btn-label">Pass</span>
                </button>
                <button class="card-footer-btn read-btn" data-article-id="${article.id}">
                    <span class="btn-icon">📖</span>
                    <span class="btn-label">Read</span>
                </button>
                <button class="card-footer-btn like-btn" data-action="like">
                    <span class="btn-icon">❤️</span>
                    <span class="btn-label">Like</span>
                </button>
            </div>
        `;

        // Add click handler for read button
        const readBtn = card.querySelector('.read-btn');
        if (readBtn) {
            readBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.showArticleDetail(article);
            });
        }

        // Add click handler for bookmark button
        const bookmarkBtn = card.querySelector('.card-bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleCardAction(article, 'save');
            });
        }

        // Add click handlers for footer action buttons
        card.querySelectorAll('.card-footer-btn').forEach(btn => {
            const action = btn.dataset.action;
            if (action) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (action === 'like') {
                        this.handleCardAction(article, 'like');
                    } else if (action === 'skip') {
                        this.handleCardAction(article, 'skip');
                    }
                });
            }
        });

        return card;
    }

    static async renderFeed() {
        const tiktokFeed = document.getElementById('tiktok-feed');
        tiktokFeed.innerHTML = '';

        console.log(`renderFeed: Starting with ${AppState.articles.length} articles`);

        // Get personalized articles
        const rankedArticles = PersonalizationEngine.rankArticles(
            AppState.articles,
            AppState.userPreferences
        );

        // Show only unread articles
        const unreadArticles = rankedArticles.filter(
            article => !AppState.userPreferences.readArticles.includes(article.id)
        );

        console.log(`renderFeed: ${unreadArticles.length} unread articles`);

        if (unreadArticles.length === 0) {
            console.log('renderFeed: No unread articles, showing empty state');
            document.getElementById('empty-state').style.display = 'block';
            return;
        }

        document.getElementById('empty-state').style.display = 'none';

        // Render all unread articles
        for (const article of unreadArticles) {
            // Auto-summarize with Claude if enabled
            if (AppState.userPreferences.autoSummarize && AppState.userPreferences.apiKey && !article.aiSummary) {
                const claude = new ClaudeAPI(AppState.userPreferences.apiKey);
                article.aiSummary = await claude.generateSummary(article.content, article.title);
            }

            const articleEl = this.createTikTokArticle(article);
            tiktokFeed.appendChild(articleEl);
        }

        // Track which article is currently visible
        this.setupScrollTracking();
    }

    static createTikTokArticle(article) {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'tiktok-article';
        articleDiv.dataset.articleId = article.id;

        const summary = article.aiSummary || article.summary;

        articleDiv.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="card-image" onerror="this.src='https://via.placeholder.com/600x250/6366f1/ffffff?text=News'">
            <div class="card-content">
                <div class="card-meta">
                    <span class="source-badge">${article.source}</span>
                    <span class="topic-tag">${article.topic}</span>
                    <span class="topic-tag">${article.readTime} min read</span>
                </div>
                <h2 class="card-title" style="cursor: pointer;">${article.title}</h2>
                ${article.aiSummary ? '<div class="ai-badge">✨ AI Summary</div>' : ''}
                <p class="card-summary">${summary}</p>
            </div>
            <div class="card-footer-actions">
                <button class="card-footer-btn read-btn" data-article-id="${article.id}">
                    <span class="btn-icon">📖</span>
                    <span class="btn-label">Read Full Article</span>
                </button>
            </div>
        `;

        // Add click handler for title
        const title = articleDiv.querySelector('.card-title');
        if (title) {
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showArticleDetail(article);
            });
        }

        // Add click handler for read button
        const readBtn = articleDiv.querySelector('.read-btn');
        if (readBtn) {
            readBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showArticleDetail(article);
            });
        }

        return articleDiv;
    }

    static setupScrollTracking() {
        const feed = document.getElementById('tiktok-feed');
        let currentArticleId = null;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const articleId = parseInt(entry.target.dataset.articleId);
                    if (articleId !== currentArticleId) {
                        currentArticleId = articleId;
                        AppState.currentArticleId = articleId;
                    }
                }
            });
        }, {
            threshold: [0.5]
        });

        feed.querySelectorAll('.tiktok-article').forEach(article => {
            observer.observe(article);
        });
    }

    static getCurrentArticle() {
        if (!AppState.currentArticleId) return null;
        return AppState.articles.find(a => a.id === AppState.currentArticleId);
    }

    static handleTikTokAction(article, action) {
        const button = document.getElementById(`${action}-action`);

        // Animate button
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 300);

        if (action === 'like') {
            if (!AppState.userPreferences.likedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.likedArticles.push(article);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, true);
            }
        } else if (action === 'dislike') {
            if (!AppState.userPreferences.dislikedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.dislikedArticles.push(article);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, false);
            }

            // Scroll to next article
            const feed = document.getElementById('tiktok-feed');
            const currentArticleEl = feed.querySelector(`[data-article-id="${article.id}"]`);
            if (currentArticleEl && currentArticleEl.nextElementSibling) {
                currentArticleEl.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (action === 'bookmark') {
            if (!AppState.userPreferences.savedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.savedArticles.push(article);
            }
        }

        // Mark as read
        if (!AppState.userPreferences.readArticles.includes(article.id)) {
            AppState.userPreferences.readArticles.push(article.id);
            AppState.stats.articlesRead++;
        }

        // Save to storage
        Storage.save('userPreferences', AppState.userPreferences);
        Storage.save('stats', AppState.stats);
    }

    static handleCardSwipe(article, direction) {
        const liked = direction === 'right';
        const saved = direction === 'up';

        // Save to history for undo
        AppState.cardHistory.push({
            article: article,
            direction: direction,
            action: liked ? 'like' : (direction === 'left' ? 'dislike' : 'other')
        });

        // Keep history limited to last 10 cards
        if (AppState.cardHistory.length > 10) {
            AppState.cardHistory.shift();
        }

        if (liked) {
            AppState.userPreferences.likedArticles.push(article);
            PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, true);
        } else if (direction === 'left') {
            AppState.userPreferences.dislikedArticles.push(article);
            PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, false);
        }

        if (saved) {
            AppState.userPreferences.savedArticles.push(article);
        }

        AppState.userPreferences.readArticles.push(article.id);
        AppState.stats.articlesRead++;

        // Save to storage
        Storage.save('userPreferences', AppState.userPreferences);
        Storage.save('stats', AppState.stats);

        // Show/hide undo button
        this.updateUndoButton();

        // Render next card
        setTimeout(() => {
            this.renderFeed();
        }, 100);
    }

    static updateUndoButton() {
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            if (AppState.cardHistory.length > 0) {
                undoBtn.style.display = 'flex';
            } else {
                undoBtn.style.display = 'none';
            }
        }
    }

    static undoLastSwipe() {
        if (AppState.cardHistory.length === 0) {
            return;
        }

        const lastAction = AppState.cardHistory.pop();
        const article = lastAction.article;

        // Remove from read articles
        const readIndex = AppState.userPreferences.readArticles.indexOf(article.id);
        if (readIndex > -1) {
            AppState.userPreferences.readArticles.splice(readIndex, 1);
        }

        // Remove from liked/disliked
        if (lastAction.action === 'like') {
            const likedIndex = AppState.userPreferences.likedArticles.findIndex(a => a.id === article.id);
            if (likedIndex > -1) {
                AppState.userPreferences.likedArticles.splice(likedIndex, 1);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, false);
            }
        } else if (lastAction.action === 'dislike') {
            const dislikedIndex = AppState.userPreferences.dislikedArticles.findIndex(a => a.id === article.id);
            if (dislikedIndex > -1) {
                AppState.userPreferences.dislikedArticles.splice(dislikedIndex, 1);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, true);
            }
        }

        // Decrease stats
        if (AppState.stats.articlesRead > 0) {
            AppState.stats.articlesRead--;
        }

        // Save to storage
        Storage.save('userPreferences', AppState.userPreferences);
        Storage.save('stats', AppState.stats);

        // Update undo button
        this.updateUndoButton();

        // Re-render feed
        this.renderFeed();
    }

    static handleCardAction(article, action) {
        if (action === 'like') {
            AppState.userPreferences.likedArticles.push(article);
            PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, true);
            AppState.userPreferences.readArticles.push(article.id);
            AppState.stats.articlesRead++;
        } else if (action === 'skip') {
            AppState.userPreferences.dislikedArticles.push(article);
            PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, false);
            AppState.userPreferences.readArticles.push(article.id);
            AppState.stats.articlesRead++;
        } else if (action === 'save') {
            if (!AppState.userPreferences.savedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.savedArticles.push(article);
            }
            // Don't mark as read or move to next card, just save
            Storage.save('userPreferences', AppState.userPreferences);
            return;
        }

        // Save to storage
        Storage.save('userPreferences', AppState.userPreferences);
        Storage.save('stats', AppState.stats);

        // Render next card (except for save action)
        setTimeout(() => {
            this.renderFeed();
        }, 100);
    }

    static async showArticleDetail(article) {
        const modal = document.getElementById('article-modal');
        const content = document.getElementById('article-content');

        // Store current article for button handlers
        AppState.currentModalArticle = article;

        // Initial render with existing content
        const renderContent = (articleContent, isLoading = false) => {
            content.innerHTML = `
                <img src="${article.image}" alt="${article.title}" style="width: 100%; border-radius: 0.5rem; margin-bottom: 1.5rem;" onerror="this.style.display='none'">
                <div style="padding: 0 0.5rem;">
                    <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <span class="source-badge">${article.source}</span>
                        <span class="topic-tag">${article.topic}</span>
                        <span class="topic-tag">${article.readTime} min read</span>
                        ${article.url ? `<a href="${article.url}" target="_blank" style="color: var(--primary); text-decoration: none;">🔗 View Original</a>` : ''}
                    </div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">${article.title}</h1>
                    ${article.aiSummary ? `<div class="ai-badge" style="margin-bottom: 1rem;">✨ AI-generated summary: ${article.aiSummary}</div>` : ''}
                    ${isLoading ? '<div style="text-align: center; padding: 2rem;"><div class="loading-spinner"></div><p>Fetching full article content...</p></div>' : ''}
                    <div style="line-height: 1.8; color: var(--text-secondary); white-space: pre-wrap;">${articleContent}</div>
                </div>
            `;
        };

        // Show initial content
        renderContent(article.content);
        modal.classList.add('active');

        // If content is short and we have a URL, try to fetch full content with Claude
        if (article.url && article.content.length < 500 && AppState.userPreferences.apiKey) {
            renderContent(article.content, true);

            try {
                const claude = new ClaudeAPI(AppState.userPreferences.apiKey);
                const fullContent = await claude.fetchArticleContent(article.url);

                if (fullContent && fullContent.length > article.content.length) {
                    article.fullContent = fullContent;
                    renderContent(fullContent, false);
                } else {
                    renderContent(article.content, false);
                }
            } catch (error) {
                console.error('Error fetching full article:', error);
                renderContent(article.content, false);
            }
        }

        // Mark as read
        if (!AppState.userPreferences.readArticles.includes(article.id)) {
            AppState.userPreferences.readArticles.push(article.id);
            AppState.stats.articlesRead++;
            Storage.save('userPreferences', AppState.userPreferences);
            Storage.save('stats', AppState.stats);
        }
    }

    static renderExploreView() {
        const exploreFeed = document.getElementById('explore-feed');

        // Get all articles, sorted by date
        const articles = [...AppState.articles].sort((a, b) =>
            new Date(b.publishedAt) - new Date(a.publishedAt)
        );

        exploreFeed.innerHTML = articles.map(article => this.createListArticleCard(article)).join('');

        // Add event listeners
        exploreFeed.querySelectorAll('.list-card').forEach(cardEl => {
            const articleId = parseInt(cardEl.dataset.articleId);
            const article = AppState.articles.find(a => a.id === articleId);

            if (article) {
                // Read button
                const readBtn = cardEl.querySelector('.read-btn');
                if (readBtn) {
                    readBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showArticleDetail(article);
                    });
                }

                // Pass button
                const passBtn = cardEl.querySelector('.dislike-btn');
                if (passBtn) {
                    passBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCardAction(article, 'skip');
                        cardEl.style.display = 'none';
                    });
                }

                // Like button
                const likeBtn = cardEl.querySelector('.like-btn');
                if (likeBtn) {
                    likeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCardAction(article, 'like');
                        cardEl.style.opacity = '0.5';
                    });
                }

                // More button (AI exploration)
                const moreBtn = cardEl.querySelector('.more-btn');
                if (moreBtn) {
                    moreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.exploreTopicWithAI(article);
                    });
                }
            }
        });
    }

    static createListArticleCard(article, matchInfo = null) {
        const summary = article.aiSummary || article.summary;

        // If we have match info (Full Coverage mode), show matching tags instead of source
        let metaBadges = '';
        if (matchInfo && matchInfo.matches && matchInfo.matches.length > 0) {
            // Show top matching keywords as tags
            const allMatches = [];

            // Extract all matched terms from the match info
            matchInfo.matches.forEach(matchStr => {
                // Parse strings like "Products: GPT-4 Turbo, ChatGPT"
                const parts = matchStr.split(':');
                if (parts.length > 1) {
                    const items = parts[1].split(',').map(s => s.trim());
                    allMatches.push(...items.slice(0, 2)); // Take first 2 from each category
                }
            });

            // Show top 3 matches as badges
            metaBadges = allMatches.slice(0, 3)
                .map(match => `<span class="source-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">✓ ${match}</span>`)
                .join('');

            // Add topic tag at end
            metaBadges += `<span class="topic-tag">${article.topic}</span>`;
        } else {
            // Normal mode: show source and topic
            metaBadges = `<span class="source-badge">${article.source}</span><span class="topic-tag">${article.topic}</span>`;
        }

        return `
            <div class="list-card" data-article-id="${article.id}">
                <img src="${article.image}" alt="${article.title}" class="list-card-image" onerror="this.src='https://via.placeholder.com/100x100/6366f1/ffffff?text=News'">
                <div class="list-card-content">
                    <div class="list-card-meta">
                        ${metaBadges}
                    </div>
                    <h3 class="list-card-title">${article.title}</h3>
                    <p class="list-card-summary">${summary}</p>

                    <div class="list-card-actions">
                        <button class="list-action-btn dislike-btn" data-action="skip" title="Pass">👎</button>
                        <button class="list-action-btn read-btn" title="Read">📖</button>
                        <button class="list-action-btn like-btn" data-action="like" title="Like">❤️</button>
                        <button class="list-action-btn more-btn" title="Find more like this">+</button>
                    </div>
                </div>
            </div>
        `;
    }

    static calculateArticleRelevance(article, analysis) {
        // Calculate a relevance score for sorting related articles
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        const fullText = titleLower + ' ' + contentLower;

        let score = 0;

        // Product name matches in title are most important
        if (analysis.productNames) {
            analysis.productNames.forEach(product => {
                if (titleLower.includes(product.toLowerCase())) score += 20;
                else if (contentLower.includes(product.toLowerCase())) score += 10;
            });
        }

        // Company name matches
        if (analysis.companyNames) {
            analysis.companyNames.forEach(company => {
                if (titleLower.includes(company.toLowerCase())) score += 15;
                else if (contentLower.includes(company.toLowerCase())) score += 8;
            });
        }

        // Specific entities
        if (analysis.specificEntities) {
            analysis.specificEntities.forEach(entity => {
                if (titleLower.includes(entity.toLowerCase())) score += 12;
                else if (contentLower.includes(entity.toLowerCase())) score += 6;
            });
        }

        // Search terms
        if (analysis.searchTerms) {
            analysis.searchTerms.forEach(term => {
                if (fullText.includes(term.toLowerCase())) score += 5;
            });
        }

        // Dates
        if (analysis.dates) {
            analysis.dates.forEach(date => {
                if (fullText.includes(date.toLowerCase())) score += 3;
            });
        }

        // Recency bonus
        const daysOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 1) score += 5;
        else if (daysOld < 7) score += 2;

        return score;
    }

    static async exploreTopicWithAI(article, targetFeed = 'search') {
        // Switch to Search tab for Full Coverage
        this.switchTab('search');

        // Show loading state in Search tab
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'ai-analysis-banner loading';
        loadingMsg.innerHTML = `
            <div class="loading-spinner"></div>
            <p>🤖 AI is analyzing "${article.title.substring(0, 50)}..." to find related content...</p>
        `;

        const feedElement = document.getElementById('search-feed');
        feedElement.innerHTML = ''; // Clear previous search
        feedElement.appendChild(loadingMsg);

        try {
            // Use Claude to analyze the article
            const claude = new ClaudeAPI(AppState.userPreferences.apiKey);
            const analysis = await claude.exploreArticleThemes(article);

            // DEBUG: Log the analysis
            console.log('🔍 AI Analysis Results:', analysis);
            console.log('Article Title:', article.title);
            console.log('Article Content Length:', article.content.length);

            // SEARCH THE WEB for related articles
            loadingMsg.innerHTML = `
                <div class="loading-spinner"></div>
                <p>🌐 Searching the web for articles about "${analysis.exactEvent || article.title.substring(0, 50)}..."</p>
            `;

            // If analysis failed or returned empty, use article title as search query
            if (!analysis.searchTerms || analysis.searchTerms.length === 0) {
                console.warn('⚠️ No search terms from Claude - using article title as fallback');
                analysis.searchTerms = article.title.toLowerCase().split(' ').filter(w => w.length > 3).slice(0, 5);
                analysis.exactEvent = article.title;
            }

            console.log('🔍 Search terms:', analysis.searchTerms);
            console.log('🔍 Exact event:', analysis.exactEvent);

            const webArticles = await claude.searchWebForArticles(analysis.searchTerms, analysis.exactEvent);
            console.log(`Found ${webArticles.length} articles from web search`);

            // Combine web results with local feed
            const combinedArticles = [...webArticles, ...AppState.articles];

            // Find related articles using the AI analysis with STRICT matching
            const relatedArticlesWithInfo = combinedArticles.filter(a => {
                if (a.id === article.id) return false;

                const titleLower = a.title.toLowerCase();
                const contentLower = a.content.toLowerCase();
                const fullText = titleLower + ' ' + contentLower;

                let matchScore = 0;
                let specificEntityMatchCount = 0; // Track how many different entity types matched
                const debugInfo = { articleId: a.id, title: a.title.substring(0, 50), matches: [] };

                // HIGHEST PRIORITY: Exact product names (must match exactly)
                let productMatchFound = false;
                if (analysis.productNames && analysis.productNames.length > 0) {
                    const productMatches = analysis.productNames.filter(product =>
                        fullText.includes(product.toLowerCase())
                    );
                    if (productMatches.length > 0) {
                        matchScore += productMatches.length * 10;
                        specificEntityMatchCount++;
                        productMatchFound = true;
                        debugInfo.matches.push(`Products: ${productMatches.join(', ')}`);
                    }
                }

                // HIGH PRIORITY: Company names (with specificity)
                let companyMatchFound = false;
                if (analysis.companyNames && analysis.companyNames.length > 0) {
                    const companyMatches = analysis.companyNames.filter(company =>
                        fullText.includes(company.toLowerCase())
                    );
                    if (companyMatches.length > 0) {
                        matchScore += companyMatches.length * 8;
                        specificEntityMatchCount++;
                        companyMatchFound = true;
                        debugInfo.matches.push(`Companies: ${companyMatches.join(', ')}`);
                    }
                }

                // HIGH PRIORITY: Specific entities (people, specific tech terms)
                let entityMatchFound = false;
                if (analysis.specificEntities && analysis.specificEntities.length > 0) {
                    const entityMatches = analysis.specificEntities.filter(entity =>
                        fullText.includes(entity.toLowerCase())
                    );
                    if (entityMatches.length > 0) {
                        matchScore += entityMatches.length * 6;
                        specificEntityMatchCount++;
                        entityMatchFound = true;
                        debugInfo.matches.push(`Entities: ${entityMatches.join(', ')}`);
                    }
                }

                // Check if we have specific entities from Claude
                const hasSpecificEntities = (analysis.productNames && analysis.productNames.length > 0) ||
                                           (analysis.companyNames && analysis.companyNames.length > 0) ||
                                           (analysis.specificEntities && analysis.specificEntities.length > 0);

                // MEDIUM PRIORITY: Check if search terms match
                if (analysis.searchTerms && analysis.searchTerms.length > 0) {
                    const searchMatches = analysis.searchTerms.filter(term =>
                        fullText.includes(term.toLowerCase())
                    );

                    if (searchMatches.length > 0) {
                        matchScore += searchMatches.length * 3;
                        debugInfo.matches.push(`Search terms: ${searchMatches.join(', ')}`);
                    }
                }

                // LOWER PRIORITY: Date matching (bonus points)
                if (analysis.dates && analysis.dates.length > 0) {
                    const dateMatches = analysis.dates.filter(date =>
                        fullText.includes(date.toLowerCase())
                    );
                    if (dateMatches.length > 0) {
                        matchScore += dateMatches.length * 2;
                        debugInfo.matches.push(`Dates: ${dateMatches.join(', ')}`);
                    }
                }

                // MATCHING LOGIC (Relaxed for better results):
                // 1. If we have specific entities from Claude (good analysis):
                //    - PREFER: At least ONE specific entity match with score >= 4 (lowered from 6 for more results)
                //    - FALLBACK: If no entity matches, accept good search term matches (score >= 6, meaning 2+ search terms)
                // 2. If we DON'T have specific entities (fallback/API failure):
                //    - REJECT the match entirely to prevent broad topic matching
                //    - This prevents matching on just "business" or "technology"

                let matches = false;

                if (hasSpecificEntities) {
                    // Good analysis - prefer specific entity matches
                    if (specificEntityMatchCount >= 1 && matchScore >= 4) {
                        // Entity match (product, company, or person) - lower threshold for more results
                        matches = true;
                    } else if (matchScore >= 6) {
                        // Allow search term matches (2+ terms) as fallback
                        matches = true;
                    }
                } else {
                    // Fallback mode (no Claude analysis) - use simple text matching
                    // Match if we have at least 1 search term match (score >= 3)
                    if (matchScore >= 3) {
                        matches = true;
                        console.log(`✅ FALLBACK: Article "${debugInfo.title}" matched with score ${matchScore}`);
                    }
                }

                // DEBUG: Log matching results
                if (matches) {
                    console.log(`✅ Article "${debugInfo.title}" MATCHED with score ${matchScore} (${specificEntityMatchCount} entity types)`);
                    console.log(`   Matches: ${debugInfo.matches.join(' | ')}`);
                    // Store match info in the article object for display
                    a.matchInfo = { matches: debugInfo.matches, score: matchScore };
                } else if (matchScore > 0) {
                    console.log(`❌ Article "${debugInfo.title}" scored ${matchScore} but didn't meet criteria (${specificEntityMatchCount} entity types, hasSpecific: ${hasSpecificEntities})`);
                }

                return matches;
            })
            .map(a => ({
                article: a,
                // Calculate relevance score for sorting
                score: this.calculateArticleRelevance(a, analysis)
            }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.article)
            .slice(0, 20);

            const relatedArticles = relatedArticlesWithInfo;

            console.log(`Found ${relatedArticles.length} related articles after filtering`);

            // Remove loading message
            loadingMsg.remove();

            if (relatedArticles.length === 0) {
                const noResultsBanner = document.createElement('div');
                noResultsBanner.className = 'ai-analysis-banner';

                //  Check if using fallback (no API key)
                const isFallback = !AppState.userPreferences.apiKey;

                noResultsBanner.innerHTML = `
                    <h3>🔍 Searching for: "${analysis.exactEvent || article.title}"</h3>
                    ${isFallback ? '<p style="color: #f59e0b; font-weight: 600;">⚠️ No Claude API key configured - using basic matching only</p>' : ''}
                    ${analysis.productNames && analysis.productNames.length > 0 ? `<p><strong>Looking for articles mentioning:</strong> ${analysis.productNames.join(', ')}</p>` : ''}
                    ${analysis.companyNames && analysis.companyNames.length > 0 ? `<p><strong>Companies:</strong> ${analysis.companyNames.join(', ')}</p>` : ''}
                    ${analysis.specificEntities && analysis.specificEntities.length > 0 ? `<p><strong>Specific details:</strong> ${analysis.specificEntities.slice(0, 5).join(', ')}</p>` : ''}
                    ${analysis.searchTerms && analysis.searchTerms.length > 0 ? `<p><strong>Search terms:</strong> ${analysis.searchTerms.join(', ')}</p>` : ''}
                    <p style="margin-top: 1rem; font-weight: 600;">No matching articles found in current feed (checked ${combinedArticles.length} articles).</p>
                    <p style="margin-top: 0.5rem; color: #666;">This happens when the RSS feeds don't have other articles about this specific story. The feed may not have recent coverage of this particular event.</p>
                    <button class="secondary-btn" onclick="document.getElementById('reload-feed-btn').click()" style="margin-top: 0.5rem; width: auto;">Refresh Feed & Try Again</button>
                `;
                feedElement.appendChild(noResultsBanner);
                feedElement.scrollTop = 0;
                return;
            }

            // Create banner with AI analysis and exit button
            const analysisBanner = document.createElement('div');
            analysisBanner.className = 'ai-analysis-banner';
            analysisBanner.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="flex: 1;">
                        <h3>🔍 Full Coverage: "${analysis.exactEvent || article.title}"</h3>
                        ${analysis.productNames && analysis.productNames.length > 0 ? `<p><strong>Products:</strong> ${analysis.productNames.join(', ')}</p>` : ''}
                        ${analysis.companyNames && analysis.companyNames.length > 0 ? `<p><strong>Companies:</strong> ${analysis.companyNames.join(', ')}</p>` : ''}
                        ${analysis.specificEntities && analysis.specificEntities.length > 0 ? `<p><strong>Key Details:</strong> ${analysis.specificEntities.slice(0, 5).join(', ')}</p>` : ''}
                        ${analysis.dates && analysis.dates.length > 0 ? `<p><strong>Dates:</strong> ${analysis.dates.join(', ')}</p>` : ''}
                        <p style="margin-top: 0.5rem; font-weight: 600;">Showing ${relatedArticles.length} related ${relatedArticles.length === 1 ? 'article' : 'articles'}</p>
                    </div>
                    <button class="secondary-btn" id="exit-full-coverage-btn" style="flex-shrink: 0;">
                        ✕ Exit Full Coverage
                    </button>
                </div>
            `;

            // Show Full Coverage in Search tab - pass match info to show tags
            const newCards = relatedArticles.map(a => this.createListArticleCard(a, a.matchInfo)).join('');
            feedElement.innerHTML = analysisBanner.outerHTML + newCards;

            // Add exit button handler to return to previous tab
            const exitBtn = feedElement.querySelector('#exit-full-coverage-btn');
            if (exitBtn) {
                exitBtn.addEventListener('click', () => {
                    // Return to Explore view
                    this.switchTab('explore');
                });
            }

            this.attachExploreEventListeners(feedElement);
            feedElement.scrollTop = 0;

        } catch (error) {
            console.error('Error exploring topic with AI:', error);
            loadingMsg.remove();

            // Fallback to simple topic matching
            const relatedArticles = AppState.articles
                .filter(a => a.topic === article.topic && a.id !== article.id)
                .slice(0, 20);

            if (relatedArticles.length > 0) {
                const banner = `<div class="ai-analysis-banner">
                    <p>🔍 Showing ${relatedArticles.length} articles in "${article.topic}"</p>
                </div>`;

                if (targetFeed === 'explore') {
                    const newCards = relatedArticles.map(a => this.createListArticleCard(a)).join('');
                    feedElement.innerHTML = banner + newCards + feedElement.innerHTML;
                    this.attachExploreEventListeners(feedElement);
                }
            } else {
                alert('No related articles found. Try refreshing the feed!');
            }
        }
    }

    static attachExploreEventListeners(exploreFeed) {
        exploreFeed.querySelectorAll('.list-card').forEach(cardEl => {
            const articleId = parseInt(cardEl.dataset.articleId);
            const art = AppState.articles.find(a => a.id === articleId);

            if (art) {
                const readBtn = cardEl.querySelector('.read-btn');
                if (readBtn) {
                    readBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showArticleDetail(art);
                    });
                }

                const passBtn = cardEl.querySelector('.dislike-btn');
                if (passBtn) {
                    passBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCardAction(art, 'skip');
                        cardEl.style.display = 'none';
                    });
                }

                const likeBtn = cardEl.querySelector('.like-btn');
                if (likeBtn) {
                    likeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCardAction(art, 'like');
                        cardEl.style.opacity = '0.5';
                    });
                }

                const moreBtn = cardEl.querySelector('.more-btn');
                if (moreBtn) {
                    moreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.exploreTopicWithAI(art, 'explore');
                    });
                }
            }
        });
    }

    static renderInsightsView() {
        // Articles read
        document.getElementById('articles-read').textContent = AppState.stats.articlesRead;

        // Top interests
        const interestBars = document.getElementById('interest-bars');
        const scores = AppState.userPreferences.topicScores;
        const sortedTopics = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sortedTopics.length === 0) {
            interestBars.innerHTML = '<p style="color: var(--text-secondary);">Read more articles to see your interests!</p>';
        } else {
            interestBars.innerHTML = sortedTopics.map(([topic, score]) => {
                const normalizedScore = ((score + 1) / 2) * 100; // Convert -1 to 1 range to 0-100
                return `
                    <div class="interest-bar">
                        <div class="interest-bar-label">${topic}</div>
                        <div class="interest-bar-fill">
                            <div class="interest-bar-value" style="width: ${normalizedScore}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Streak
        document.getElementById('streak-value').textContent = `${AppState.stats.streak} days`;
    }
}

// ===== EVENT HANDLERS =====
function setupEventListeners() {
    // Interest chips selection
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
        });
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', () => {
        const selectedChips = document.querySelectorAll('.chip.selected');
        AppState.userPreferences.interests = Array.from(selectedChips).map(
            chip => chip.dataset.topic
        );

        // Initialize topic scores
        AppState.userPreferences.interests.forEach(topic => {
            AppState.userPreferences.topicScores[topic] = 0.3; // Initial boost
        });

        Storage.save('userPreferences', AppState.userPreferences);
        Storage.save('hasOnboarded', true);

        UIController.showScreen('app-screen');
        UIController.renderFeed();
    });

    // Article modal action buttons
    document.getElementById('article-like-btn').addEventListener('click', () => {
        const article = AppState.currentModalArticle;
        if (article) {
            const button = document.getElementById('article-like-btn');
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            if (!AppState.userPreferences.likedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.likedArticles.push(article);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, true);
                Storage.save('userPreferences', AppState.userPreferences);
                alert('Article liked! ❤️');
            }
        }
    });

    document.getElementById('article-dislike-btn').addEventListener('click', () => {
        const article = AppState.currentModalArticle;
        if (article) {
            const button = document.getElementById('article-dislike-btn');
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            if (!AppState.userPreferences.dislikedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.dislikedArticles.push(article);
                PersonalizationEngine.updateTopicScores(AppState.userPreferences, article, false);
                Storage.save('userPreferences', AppState.userPreferences);
                alert('Article passed 👎');
            }
        }
    });

    document.getElementById('article-bookmark-btn').addEventListener('click', () => {
        const article = AppState.currentModalArticle;
        if (article) {
            const button = document.getElementById('article-bookmark-btn');
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            if (!AppState.userPreferences.savedArticles.find(a => a.id === article.id)) {
                AppState.userPreferences.savedArticles.push(article);
                Storage.save('userPreferences', AppState.userPreferences);
                alert('Article bookmarked! 🔖');
            }
        }
    });

    document.getElementById('article-more-btn').addEventListener('click', async () => {
        const article = AppState.currentModalArticle;
        if (article) {
            const button = document.getElementById('article-more-btn');
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            // Close the modal
            document.getElementById('article-modal').classList.remove('active');

            // Switch to Explore tab
            UIController.switchTab('explore');

            // Explore with AI in the explore view
            await UIController.exploreTopicWithAI(article, 'explore');
        }
    });

    document.getElementById('article-read-btn').addEventListener('click', () => {
        const article = AppState.currentModalArticle;
        if (article && article.url) {
            const button = document.getElementById('article-read-btn');
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            // Open original article in new tab
            window.open(article.url, '_blank');
        }
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            UIController.switchTab(btn.dataset.tab);
        });
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('active');
        document.getElementById('api-key-input').value = AppState.userPreferences.apiKey || '';
        document.getElementById('auto-summarize-toggle').checked = AppState.userPreferences.autoSummarize;
        document.getElementById('personalization-toggle').checked = AppState.userPreferences.personalization;
        document.getElementById('dark-mode-toggle').checked = AppState.userPreferences.darkMode;
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('active');
    });

    document.getElementById('save-settings-btn').addEventListener('click', () => {
        AppState.userPreferences.apiKey = document.getElementById('api-key-input').value;
        AppState.userPreferences.autoSummarize = document.getElementById('auto-summarize-toggle').checked;
        AppState.userPreferences.personalization = document.getElementById('personalization-toggle').checked;
        AppState.userPreferences.darkMode = document.getElementById('dark-mode-toggle').checked;

        if (AppState.userPreferences.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        Storage.save('userPreferences', AppState.userPreferences);
        document.getElementById('settings-modal').classList.remove('active');

        // Re-render feed with new settings
        UIController.renderFeed();
    });

    // Article modal close
    document.getElementById('close-article-btn').addEventListener('click', () => {
        document.getElementById('article-modal').classList.remove('active');
    });

    // Reset preferences
    document.getElementById('reset-preferences-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all preferences? This cannot be undone.')) {
            Storage.remove('userPreferences');
            Storage.remove('stats');
            Storage.remove('hasOnboarded');
            location.reload();
        }
    });

    // Reload feed
    document.getElementById('reload-feed-btn').addEventListener('click', async () => {
        // Show loading state
        const btn = document.getElementById('reload-feed-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            // Fetch fresh articles from RSS feeds
            const topics = AppState.userPreferences.interests.length > 0
                ? AppState.userPreferences.interests
                : Object.keys(RSS_FEEDS);

            const freshArticles = await RSSFeedFetcher.fetchAllTopics(topics);

            if (freshArticles.length > 0) {
                AppState.articles = freshArticles;
                // Reset read articles to see new content
                AppState.userPreferences.readArticles = [];
                Storage.save('userPreferences', AppState.userPreferences);
                UIController.renderFeed();
                console.log(`Reloaded ${freshArticles.length} fresh articles`);
            } else {
                alert('Unable to fetch new articles. Please check your connection.');
            }
        } catch (error) {
            console.error('Error reloading feed:', error);
            alert('Error reloading feed. Please try again.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ===== INITIALIZATION =====
async function initialize() {
    // Load saved data
    const savedPreferences = Storage.load('userPreferences');
    if (savedPreferences) {
        AppState.userPreferences = { ...AppState.userPreferences, ...savedPreferences };
    }

    const savedStats = Storage.load('stats');
    if (savedStats) {
        AppState.stats = { ...AppState.stats, ...savedStats };
    }

    const hasOnboarded = Storage.load('hasOnboarded', false);

    // Apply dark mode if enabled
    if (AppState.userPreferences.darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Setup event listeners
    setupEventListeners();

    // Start with sample articles for instant loading
    AppState.articles = [...SAMPLE_ARTICLES];
    console.log(`Loaded ${AppState.articles.length} sample articles`);

    // Show appropriate screen immediately
    console.log('hasOnboarded:', hasOnboarded);

    if (hasOnboarded) {
        console.log('Showing app screen');
        UIController.showScreen('app-screen');
        UIController.renderFeed();
    } else {
        console.log('Showing onboarding screen');
        UIController.showScreen('onboarding-screen');
    }

    // Fetch fresh articles from RSS feeds in the background
    console.log('Fetching articles from RSS feeds in background...');
    fetchRSSInBackground(hasOnboarded);

    console.log('Initialization complete');
}

// Fetch RSS feeds in the background
async function fetchRSSInBackground(hasOnboarded) {
    try {
        const topics = AppState.userPreferences.interests.length > 0
            ? AppState.userPreferences.interests
            : null;

        const freshArticles = await RSSFeedFetcher.fetchAllTopics(topics);

        if (freshArticles.length > 0) {
            console.log(`Loaded ${freshArticles.length} fresh articles from RSS feeds`);
            AppState.articles = freshArticles;

            // Refresh the feed if user is already in the app
            if (hasOnboarded && AppState.currentScreen === 'app-screen') {
                console.log('Refreshing feed with fresh articles');
                UIController.renderFeed();
            }
        } else {
            console.log('No articles from RSS, keeping sample articles');
        }
    } catch (error) {
        console.error('Error fetching RSS feeds:', error);
    }
}

// Expose AppState for debugging and testing
window.AppState = AppState;

// Start the app
console.log('app.js loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, starting initialization');
    initialize().catch(error => {
        console.error('Initialization error:', error);
        // Fallback: show onboarding screen even if fetch fails
        UIController.showScreen('onboarding-screen');
    });
});
