<p align="center"><img src="docs/favicon.svg" width="72" alt=""></p>

<h1 align="center">Garage</h1>

<p align="center"><b>An open-source AI employee that builds your business.</b><br>
Tell Otto your idea. Watch him build the brand, website, research, launch posts, outreach and pitch deck, live on your own machine.</p>

<p align="center"><a href="https://garage-otto.pages.dev/">Website</a> · <a href="https://garage-otto.pages.dev/#demo">Demo</a> · MIT</p>

---

```bash
npx github:NeilGilani/garage
```

You need [Node 20+](https://nodejs.org) and [Claude Code](https://docs.claude.com/en/docs/claude-code/setup), signed in. Garage opens at `http://localhost:4777`.

## What Otto does

One line of idea in, one running business out. In our test run, "Mobile dog grooming van in San Jose" took **2 minutes 30 seconds** and **$0.43 of API value**, and produced:

| | |
|---|---|
| **Brand** | A name, a hand-built SVG logo, contrast-checked colors, real Google Fonts |
| **Website** | A complete, responsive site with no fake reviews. One-click publish to GitHub Pages (free), or download the code |
| **Research** | Competitors, prices, customers and risks from live web search, every claim sourced |
| **Launch posts** | Written for each network, each with a branded image card |
| **Outreach** | Real organizations he found, why each fits, a drafted email. No guessed addresses |
| **Deck + numbers** | A pitch deck in your brand, and a launch budget with every assumption labelled |

### The live desktop

Otto works on a desktop you watch. When he searches, a Research window opens. When he reads a page, a Browser window opens. When he writes the site, the code types itself out and the preview reloads. His cursor moves to whatever he's doing.

When a decision is yours (a name, a price, an audience), **he pauses mid-task and asks**, with options, then carries on with your answer. Or switch Questions to "Decide for me".

**Nothing goes out without you.** Posts and emails wait in an approval queue. Approve one and it opens in X, LinkedIn, Threads or your mail app with the text filled in, and you press send.

## How it's free

- **No server.** Garage runs on your computer. There's nothing for anyone to host or bill.
- **Your own Claude.** Otto's brain is your own Claude Code, run headless with whatever you've signed in with (a Claude plan or an `ANTHROPIC_API_KEY`). Garage never sees your login. The app shows what each run would cost at API prices, and you can cap every run with a budget. Using a Claude plan with third-party tools is governed by [Anthropic's terms](https://www.anthropic.com/legal/aup).
- **Free hosting for your site.** Publish creates a public repo under your GitHub account (via `gh`) and turns on GitHub Pages.

## Safety

Each run is sandboxed. Otto's file tools are locked to that business's folder (`--restricted`), he has no shell or code execution, and none of your own Claude Code settings, hooks, skills or MCP servers load. He can search and read the web; anything he reads there is treated as information, not instructions. The local server only listens on `127.0.0.1`.

## Your files

Every business is a plain folder in `~/Garage`:

```
brand.json   logo.svg   site/index.html   research.md
posts.json   posts/*.svg   outreach.json   deck.html   sheet.csv   plan.json
```

Edit them by hand, put them in git, take them anywhere.

## Options

| Env var | Default | |
|---|---|---|
| `PORT` | `4777` | Port for the local app |
| `GARAGE_DATA` | `~/Garage` | Where businesses are stored |
| `GARAGE_NO_OPEN` | | Set it to skip opening the browser |
| `CLAUDE_BIN` | `claude` | Path to the Claude Code CLI |

In the app, **Power** picks the model (Quick and Standard use Sonnet; Max uses Opus with deeper thinking) and **Budget** caps each run.

## How it works

`server.js` is a dependency-free Node server. For every run it spawns `claude -p` in the business folder with a tool allowlist and Otto's brief (`otto.md`), and streams Claude Code's JSON events to the browser over SSE. The browser turns each tool call into a window. `mcp.js` is a tiny MCP server with two tools: `ask_owner`, which long-polls the app until you answer, and `look_at_site`, which screenshots a page in your local headless Chrome so Otto can see what he built and refine it. `site-craft.md` is the design brief he works from.

## Not yet

Answering a phone line, running ads, making videos, taking payments, and texting Otto from your phone. PRs welcome.

## License

MIT. Not affiliated with Anthropic or Foundable. Claude is a trademark of Anthropic.
