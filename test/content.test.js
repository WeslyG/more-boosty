import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { getAccessToken, getContentMetadata, getPlayerDetails } from '../source/content/players.js';
import { createDownloadLinks } from '../source/content/templates.js';

const bundled = await build({
  entryPoints: ['source/content/content.js'], bundle: true, write: false, format: 'iife',
});
const code = bundled.outputFiles[0].text;
const video = (id) => ({
  videoId: id,
  previewUrl: 'https://images.boosty.to/image/' + id,
  videoUrls: ['ultra_hd', 'quad_hd', 'full_hd', 'high', 'medium', 'low'].map((type) => ({
    type, url: 'https://video.example/' + id + '/' + type + '.mp4',
  })),
});

const setup = (sendMessage = async () => ({ videos: [video('one'), video('two')] })) => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: 'https://boosty.to/author/posts/post-id', runScripts: 'outside-only',
  });
  const { window } = dom;
  const frames = [];
  const timers = new Map();
  let timerId = 0;
  let clock = 0;
  const calls = [];
  window.requestAnimationFrame = (fn) => frames.push(fn);
  window.setTimeout = (fn, delay) => { timers.set(++timerId, { fn, at: clock + delay }); return timerId; };
  window.clearTimeout = (id) => timers.delete(id);
  window.Date.now = () => clock;
  window.chrome = {
    i18n: { getMessage: (key, quality) => ({ download_quality: 'Download ' + quality, download_preview: 'Preview' })[key] ?? key },
    runtime: { sendMessage: (message) => { calls.push(message); return sendMessage(message); } },
  };
  const flush = async () => {
    for (let index = 0; index < 12; index++) {
      await new Promise((resolve) => setImmediate(resolve));
      for (const frame of frames.splice(0)) frame();
    }
  };
  const advance = async (ms) => {
    clock += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    }
    await flush();
  };
  const addPlayer = (id, ready = true) => {
    const host = window.document.createElement('div');
    host.className = 'VideoBlock-test';
    const aspect = window.document.createElement('div');
    aspect.className = 'VideoPlayerContainer-test';
    const positioned = window.document.createElement('div');
    positioned.className = 'VideoPlayer-test';
    const player = window.document.createElement('vk-video-player');
    const shadowHost = window.document.createElement('div');
    shadowHost.className = 'shadow-root-container';
    player.append(shadowHost);
    positioned.append(player);
    aspect.append(positioned);
    host.append(aspect);
    window.document.querySelector('#root').append(host);
    const initialize = () => {
      const root = shadowHost.attachShadow({ mode: 'open' });
      root.innerHTML = '<div class="player-wrapper"><div class="container"></div></div>';
      root.querySelector('.container').style.backgroundImage = 'url("https://images.boosty.to/image/' + id + '")';
      return root;
    };
    const root = ready ? initialize() : null;
    return { player, host, root, initialize };
  };
  return {
    window, calls, addPlayer, flush, advance,
    start: () => window.eval(code),
    approve: async () => { await flush(); window.document.querySelector('.more-boosty-request button')?.click(); await flush(); },
    close: () => window.close(),
  };
};

test('auth is not read and nothing is requested until the user approves this content', async (t) => {
  const app = setup();
  t.after(app.close);
  app.addPlayer('one');
  let authReads = 0;
  const getItem = app.window.Storage.prototype.getItem;
  app.window.Storage.prototype.getItem = function (key) {
    if (key === 'auth') authReads++;
    return getItem.call(this, key);
  };
  app.start();
  await app.flush();
  assert.equal(authReads, 0);
  assert.equal(app.calls.length, 0);
  assert.equal(app.window.document.querySelectorAll('.more-boosty-request button').length, 1);
  const prompt = app.window.document.querySelector('.more-boosty-request');
  assert.equal(prompt.closest('.more-boosty-panel').previousElementSibling.className, 'VideoPlayerContainer-test');
  assert.equal(prompt.closest('.VideoPlayer-test'), null);
  const panel = prompt.closest('.more-boosty-panel');
  const notice = prompt.querySelector('p');
  await app.approve();
  assert.equal(panel.querySelector('p'), notice);
  assert.equal(app.window.document.querySelector('.more-boosty-panel'), panel);
  assert.equal(app.window.document.querySelector('.more-boosty-request'), prompt);
  assert.ok(authReads > 0);
  assert.equal(app.calls.length, 1);
  app.window.history.pushState({}, '', '/author/posts/unapproved');
  app.window.dispatchEvent(new app.window.PopStateEvent('popstate'));
  const previousReads = authReads;
  await app.flush();
  assert.equal(app.calls.length, 1);
  assert.equal(authReads, previousReads);
  assert.equal(app.window.document.querySelectorAll('.more-boosty-downloads').length, 0);
  assert.equal(app.window.document.querySelectorAll('.more-boosty-request button').length, 1);
});

test('multiple players get all qualities and preview, without duplicate controls or API storms', async (t) => {
  const app = setup();
  t.after(app.close);
  const first = app.addPlayer('one');
  const second = app.addPlayer('two');
  app.start();
  await app.approve();
  assert.equal(app.calls.length, 2);
  for (const { host } of [first, second]) {
    assert.equal(host.querySelectorAll('.more-boosty-downloads').length, 1);
    assert.equal(host.querySelectorAll('a').length, 7);
    assert.ok(host.querySelector('.more-boosty-panel .more-boosty-notice-title'));
    assert.deepEqual([...host.querySelectorAll('a')].map((a) => a.textContent),
      ['Download 2160p', 'Download 1440p', 'Download 1080p', 'Download 720p', 'Download 480p', 'Download 360p', 'Preview']);
  }
  for (let index = 0; index < 20; index++) first.root.querySelector('.container').setAttribute('data-time', index);
  await app.flush();
  assert.equal(app.calls.length, 2);
  assert.equal(first.host.querySelectorAll('.more-boosty-downloads').length, 1);
});

test('players attached later and late Shadow DOM are discovered', async (t) => {
  const app = setup();
  t.after(app.close);
  app.start();
  await app.approve();
  const late = app.addPlayer('one', false);
  await app.flush();
  assert.equal(app.calls.length, 0);
  late.initialize();
  await app.advance(1000);
  await app.approve();
  assert.equal(late.host.querySelectorAll('a').length, 7);
  const dynamic = app.addPlayer('two');
  await app.flush();
  assert.equal(dynamic.host.querySelectorAll('a').length, 7);
});

test('detached players and stale responses cannot leave controls on another post', async (t) => {
  const resolvers = [];
  const app = setup(() => new Promise((resolve) => resolvers.push(resolve)));
  t.after(app.close);
  const { player, host } = app.addPlayer('one');
  app.start();
  await app.approve();
  app.window.history.pushState({}, '', '/author/posts/another-post');
  app.window.dispatchEvent(new app.window.PopStateEvent('popstate'));
  await app.approve();
  assert.equal(app.calls.length, 2);
  resolvers[0]({ videos: [video('one')] });
  await app.flush();
  assert.equal(host.querySelectorAll('a').length, 0);
  resolvers[1]({ videos: [video('one')] });
  await app.flush();
  assert.equal(host.querySelectorAll('a').length, 7);
  player.remove();
  await app.flush();
  assert.equal(host.querySelectorAll('a').length, 0);
});

test('reused players update links when the preview changes', async (t) => {
  const app = setup();
  t.after(app.close);
  const { root, host } = app.addPlayer('one');
  app.start();
  await app.approve();
  root.querySelector('.container').style.backgroundImage = 'url("https://images.boosty.to/image/two")';
  await app.flush();
  assert.equal(app.calls.length, 2);
  assert.match(host.querySelector('a').href, /\/two\//);
  assert.equal(host.querySelectorAll('.more-boosty-downloads').length, 1);
});

test('temporary message errors retry, while persistent errors stop after three attempts', async (t) => {
  let calls = 0;
  const app = setup(async () => ++calls === 1 ? { error: 'offline' } : { videos: [video('one')] });
  t.after(app.close);
  const { host } = app.addPlayer('one');
  app.start();
  await app.approve();
  assert.equal(app.calls.length, 1);
  await app.advance(5000);
  assert.equal(host.querySelectorAll('a').length, 7);

  const failed = setup(async () => { throw new Error('offline'); });
  t.after(failed.close);
  failed.addPlayer('one');
  failed.start();
  await failed.approve();
  for (let index = 0; index < 5; index++) await failed.advance(5000);
  assert.equal(failed.calls.length, 3);
  const retry = failed.window.document.querySelector('.more-boosty-request > button');
  assert.equal(retry.textContent, 'retry_video_links');
  assert.equal(retry.hasAttribute('aria-disabled'), false);
  retry.click();
  assert.equal(retry.textContent, 'loading_video_links');
  await failed.flush();
  assert.equal(failed.calls.length, 4);
});

test('removed controls are restored even after repeated site rerenders', async (t) => {
  const app = setup();
  t.after(app.close);
  const { host } = app.addPlayer('one');
  app.start();
  await app.approve();
  for (let index = 0; index < 5; index++) {
    host.querySelector('.more-boosty-downloads').remove();
    await app.flush();
    assert.equal(host.querySelectorAll('a').length, 7);
  }
});

test('feed navigation mounts controls for the new card without reloading', async (t) => {
  const app = setup();
  t.after(app.close);
  const { window } = app;
  window.history.replaceState({}, '', '/author');
  const addFeedVideo = (videoId, postId) => {
    const { host } = app.addPlayer(videoId);
    const card = window.document.createElement('div');
    card.className = 'Post-scss--module_root_test';
    const permalink = window.document.createElement('a');
    permalink.className = 'CreatedAt-scss--module_headerLink_test';
    permalink.href = '/author/posts/' + postId;
    host.before(card);
    const article = window.document.createElement('article');
    article.className = 'Post-scss--module_content_test';
    article.append(host);
    const readMore = window.document.createElement('button');
    readMore.textContent = 'Read more';
    card.append(permalink, article, readMore);
    return card;
  };
  const first = addFeedVideo('one', 'first');
  app.start();
  await app.approve();
  assert.equal(app.calls[0].metadata.id, 'first');
  first.remove();
  const second = addFeedVideo('two', 'second');
  await app.flush();
  const panel = second.querySelector('.more-boosty-panel');
  assert.ok(panel.querySelector('.more-boosty-request button'));
  assert.ok(panel.closest('article'));
  assert.equal(panel.previousElementSibling.className, 'VideoPlayerContainer-test');
  assert.equal(app.calls.length, 1);
  await app.approve();
  assert.equal(app.calls[1].metadata.id, 'second');
  assert.match(second.querySelector('.more-boosty-downloads a').href, /two/);
});

test('metadata follows the player in feeds and media overlays', () => {
  const dom = new JSDOM('<div class="MediaViewer_root_test"><a class="GoToPostButton_link_test" href="/other/posts/overlay/?from=media"></a><vk-video-player></vk-video-player></div>', {
    url: 'https://boosty.to/author/posts/old-post',
  });
  const { window } = dom;
  assert.deepEqual(getContentMetadata(window.document.querySelector('vk-video-player'), window.location),
    { type: 'post', blogName: 'other', id: 'overlay' });
  const player = window.document.createElement('vk-video-player');
  window.document.body.append(player);
  assert.deepEqual(getContentMetadata(player, { href: 'https://boosty.to/app/messages?dialogId=123' }),
    { type: 'dialog', id: '123' });
  window.close();
});

test('missing and malformed auth do not crash the content script', () => {
  assert.equal(getAccessToken({ getItem: () => null }), null);
  assert.equal(getAccessToken({ getItem: () => '{invalid' }), null);
  assert.equal(getAccessToken({ getItem: () => { throw new Error('denied'); } }), null);
  assert.equal(getAccessToken({ getItem: () => '{"accessToken":"test-token"}' }), 'test-token');
});

test('preview detection supports shorthand background styles used by Chromium', () => {
  const app = setup();
  const { player, root } = app.addPlayer('one');
  root.querySelector('.container').setAttribute('style', 'background: url("https://images.boosty.to/image/one") #222');
  assert.equal(getPlayerDetails(player).videoId, 'one');
  app.close();
});

test('links use safe DOM APIs and isolate newly opened tabs', () => {
  const dom = new JSDOM('');
  const controls = createDownloadLinks(dom.window.document, {
    videoUrls: [{ type: 'high', url: 'javascript:alert(1)' }, { type: 'low', url: 'https://video.example/?q="<script>' }],
    previewUrl: 'data:text/html,bad',
  }, () => '<img src=x onerror=alert(1)>');
  assert.equal(controls.querySelectorAll('a').length, 1);
  assert.equal(controls.querySelectorAll('img, script').length, 0);
  assert.equal(controls.querySelector('a').rel, 'noopener noreferrer');
  assert.equal(controls.querySelector('a').textContent, '<img src=x onerror=alert(1)>');
  dom.window.close();
});

test('quality menu moves focus through links and returns it to the trigger', async (t) => {
  const app = setup();
  t.after(app.close);
  app.addPlayer('one');
  app.start();
  await app.approve();
  const { document, Event, KeyboardEvent } = app.window;
  const menu = document.querySelector('.more-boosty-menu');
  const trigger = menu.querySelector('summary');
  const list = menu.querySelector('.more-boosty-quality-list');
  const links = [...list.querySelectorAll('a')];
  const press = (key, options) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
    key, bubbles: true, cancelable: true, ...options,
  }));

  trigger.focus();
  trigger.click();
  assert.equal(menu.open, true);
  assert.equal(document.activeElement, links[0]);
  // Moving the pointer over another resolution must not move keyboard focus.
  links[2].dispatchEvent(new Event('pointermove', { bubbles: true }));
  assert.equal(list.hasAttribute('data-pointer'), true);
  assert.equal(document.activeElement, links[0]);
  list.dispatchEvent(new Event('pointerleave'));
  assert.equal(list.hasAttribute('data-pointer'), false);
  links[2].dispatchEvent(new Event('pointermove', { bubbles: true }));
  links[0].blur();
  links[0].focus();
  assert.equal(list.hasAttribute('data-pointer'), false);
  links[2].dispatchEvent(new Event('pointermove', { bubbles: true }));
  press('ArrowDown');
  assert.equal(list.hasAttribute('data-pointer'), false);
  assert.equal(document.activeElement, links[1]);
  press('End');
  assert.equal(document.activeElement, links.at(-1));
  press('Escape');
  assert.equal(menu.open, false);
  assert.equal(document.activeElement, trigger);

  press('ArrowDown');
  assert.equal(document.activeElement, links[0]);
  press('Tab', { shiftKey: true });
  assert.equal(menu.open, false);
  assert.equal(document.activeElement, trigger);

  press('ArrowUp');
  assert.equal(document.activeElement, links.at(-1));
  document.querySelector('.more-boosty-preview').focus();
  assert.equal(menu.open, false);

  trigger.click();
  document.body.click();
  assert.equal(menu.open, false);
});

test('a preview keeps its panel and button while the player initializes during loading', async (t) => {
  const resolvers = [];
  const app = setup(() => new Promise((resolve) => resolvers.push(resolve)));
  t.after(app.close);
  const { document } = app.window;
  const block = document.createElement('div');
  block.className = 'VideoBlock-scss--module_root_preview';
  document.querySelector('#root').append(block);
  app.start();
  await app.flush();

  assert.equal(block.nextElementSibling, null);
  await app.advance(240);
  const panel = block.nextElementSibling;
  const button = panel.querySelector('button');
  panel.remove();
  await app.flush();
  assert.equal(block.nextElementSibling, panel);
  button.focus();
  button.click();
  assert.equal(button.textContent, 'loading_video_links');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  button.click();
  await app.flush();
  assert.equal(app.calls.length, 1);

  const { host } = app.addPlayer('one');
  block.append(host);
  await app.flush();
  assert.equal(block.nextElementSibling, panel);
  assert.equal(panel.querySelector('button'), button);
  assert.equal(button.textContent, 'loading_video_links');
  resolvers[0]({ videos: [video('one')] });
  await app.flush();
  assert.equal(panel.querySelector('button'), button);

  resolvers[1]({ videos: [video('one')] });
  await app.flush();
  assert.equal(block.nextElementSibling, panel);
  assert.equal(panel.querySelectorAll('a').length, 7);
  assert.equal(document.activeElement, panel.querySelector('summary'));
});

test('a response without a matching video ends loading and allows another request', async (t) => {
  const app = setup(async () => ({ videos: [] }));
  t.after(app.close);
  const { host } = app.addPlayer('one');
  app.start();
  await app.approve();
  const button = host.querySelector('.more-boosty-request > button');
  assert.equal(button.textContent, 'video_links_unavailable');
  assert.equal(button.hasAttribute('aria-disabled'), false);
  button.click();
  await app.flush();
  assert.equal(app.calls.length, 2);
});

test('a preview-only post can show links before its player mounts', async (t) => {
  const app = setup(async () => ({ videos: [video('one')] }));
  t.after(app.close);
  const { document } = app.window;
  app.start();
  await app.flush();
  app.window.history.pushState({}, '', '/author/posts/from-feed');
  const preview = document.createElement('div');
  preview.className = 'VideoBlock-scss--module_root_preview';
  document.querySelector('#root').append(preview);
  await app.flush();
  await app.advance(240);
  assert.ok(preview.nextElementSibling?.querySelector('button'));
  assert.equal(app.calls.length, 0);
  await app.approve();
  assert.equal(app.calls[0].metadata.id, 'from-feed');
  assert.equal(preview.nextElementSibling.querySelectorAll('.more-boosty-downloads a').length, 7);
});
