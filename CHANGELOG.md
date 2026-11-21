# Изменения More Boosty

Здесь начинается новый цикл версий More Boosty. Заметки каждого выпуска доступны на русском и английском.
Версионный раздел готовится до отправки тега; опубликованные выпуски находятся в
[GitHub Releases](https://github.com/WeslyG/more-boosty/releases).

## [Unreleased]

## [1.1.0] - 2026-11-21

### Русский

- Меню качества поддерживает Tab и стрелки. Подсветка следует за последним действием мыши или клавиатуры.
- Плашка остаётся под тем же блоком, когда Boosty меняет превью на плеер.
- Кнопка показывает загрузку ссылок и предлагает повторить запрос при сбое.
- В ленте и посте используется одна компактная плашка с постоянным пояснением. В списке качества есть подписи скачивания и подсветка пунктов без наложения рамок.

- Свёрнутый пост больше не обрезает список качества.

- Плашка целиком видна перед кнопкой «Читать далее» в ленте.
- Пояснение перед показом ссылок сокращено до одного предложения.
- Исправлено появление расширения при переходе между видео в ленте Boosty.
- Добавлены ссылки установки из Chrome Web Store в оба README.
- Проверки и релизы используют общие GitHub runners; существующий тег можно опубликовать ручным запуском Release.
- Скриншоты README и карточек стора показывают название поста, плеер и кнопки, без канала и комментариев.

### English

- The quality menu supports Tab and arrow keys. Highlighting follows the latest pointer or keyboard input.
- The panel stays under the same video block when Boosty replaces the preview with the player.
- The button shows loading progress and offers a retry when the request fails.
- Feed and post views share a compact panel with a persistent notice and labeled download links that highlight without overlapping outlines.

- Collapsed feed posts no longer clip the quality menu.

- The full extension panel is visible above Read more in the feed.
- Shortened the notice before showing video links to one sentence.
- Fixed extension controls when moving between videos in the Boosty feed.
- Added Chrome Web Store installation links to both READMEs.
- Checks and releases use GitHub-hosted runners; existing tags can be published through a manual Release run.
- README and store screenshots show the post title, player and buttons, without channel details or comments.


## [1.0.0] - 2026-11-20

### Русский

- Ссылки на видео Boosty во всех доступных качествах и сохранение превью.
- Кнопки выровнены по центру плеера; ссылка на превью выделена отдельным цветом.
- Поддержка нескольких плееров, поздней загрузки Shadow DOM и переходов между постами.
- Пояснение об обработке данных и запрос ссылок только после нажатия пользователя.
- Минимальные разрешения, строгая CSP и временный кэш без записи данных расширением на диск.
- Удалены неработающие настройки, уведомления, рекламные ссылки и прежняя сборочная инфраструктура.
- README со скриншотами, политики конфиденциальности и материалы для стора на русском и английском.
- Правила коммитов, проверки на Windows и Linux, релизы по тегам с ZIP и SHA-256.

### English

- Boosty video links in every available quality, plus preview-image links.
- Centered player buttons with a distinct color for the preview link.
- Support for multiple players, delayed Shadow DOM and navigation between posts.
- An in-page data-use notice and content requests only after explicit user action.
- Narrow permissions, a strict CSP and temporary in-memory caching without extension disk storage.
- Removed inactive settings, notifications, promotional links and the previous build infrastructure.
- Russian and English READMEs with screenshots, privacy policies and store listing materials.
- Commit conventions, Windows and Linux checks, and tag-based releases with ZIP and SHA-256.
