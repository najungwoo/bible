// 힌트 적용 로직 (현재 빈칸에 힌트 텍스트 표시)
function applyHintToDisplay(hintPart, fullAnswer) {
    // 1. Try Reference Block
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (applyHintToContainer(refContainer, hintPart, fullAnswer, true)) return;
    }

    // 2. Try Verse Content
    const verseContainer = problemArea.querySelector('.verse-content');
    if (verseContainer) {
        applyHintToContainer(verseContainer, hintPart, fullAnswer, false);
    }
}

function applyHintToContainer(container, hintPart, fullAnswer, isReference) {
    const children = Array.from(container.childNodes);
    let foundBlank = false;
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                let match = null;

                if (currentMode === 5 && !isReference) {
                    match = findChosungMatch(text, fullAnswer);
                } else {
                    match = text.match(/(_+)/);
                }

                if (match) {
                    const blankIndex = match.index !== undefined ? match.index : text.indexOf(match[0]);
                    const beforeBlank = text.substring(0, blankIndex);

                    // The original mask (e.g. ____ or ㅌㅊㅇ)
                    const originalMask = match[0];
                    let remainingMask = "";
                    if (currentMode === 5 && !isReference) {
                        remainingMask = getRemainingChosungMask(fullAnswer, hintPart.length);
                    } else if (isReference || currentMode === 3) {
                        // Reference mode or Reference block: use underscore mask based on hint length
                        remainingMask = getRemainingUnderscoresMask(fullAnswer, hintPart.length);
                    } else {
                        remainingMask = originalMask.substring(Math.min(hintPart.length, originalMask.length));
                    }

                    const afterBlankText = text.substring(blankIndex + originalMask.length);

                    if (beforeBlank) {
                        newContent.appendChild(document.createTextNode(beforeBlank));
                    }

                    const hintSpan = document.createElement('span');
                    hintSpan.className = 'hint-text';
                    hintSpan.textContent = hintPart;
                    newContent.appendChild(hintSpan);

                    if (remainingMask) {
                        newContent.appendChild(document.createTextNode(remainingMask));
                    }

                    if (afterBlankText) {
                        newContent.appendChild(document.createTextNode(afterBlankText));
                    }

                    foundBlank = true;
                    continue;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                // Update existing hint
                const oldHintLength = node.textContent.length;
                node.textContent = hintPart;
                newContent.appendChild(node);
                foundBlank = true;

                // Update the remaining mask length
                if (i + 1 < children.length && children[i + 1].nodeType === Node.TEXT_NODE) {
                    const nextText = children[i + 1].textContent;

                    if (currentMode === 5 && !isReference) {
                        const remainingMask = getRemainingChosungMask(fullAnswer, hintPart.length);
                        const oldRemainingMask = getRemainingChosungMask(fullAnswer, oldHintLength);

                        if (oldRemainingMask !== "" && nextText.startsWith(oldRemainingMask)) {
                            i++;
                            const afterTarget = nextText.substring(oldRemainingMask.length);
                            if (remainingMask) newContent.appendChild(document.createTextNode(remainingMask));
                            if (afterTarget) newContent.appendChild(document.createTextNode(afterTarget));
                        }
                    } else if (isReference || currentMode === 3) {
                        const remainingMask = getRemainingUnderscoresMask(fullAnswer, hintPart.length);
                        const oldRemainingMask = getRemainingUnderscoresMask(fullAnswer, oldHintLength);

                        if (oldRemainingMask !== "" && nextText.startsWith(oldRemainingMask)) {
                            i++;
                            const afterTarget = nextText.substring(oldRemainingMask.length);
                            if (remainingMask) newContent.appendChild(document.createTextNode(remainingMask));
                            if (afterTarget) newContent.appendChild(document.createTextNode(afterTarget));
                        } else if (nextText.match(/^_+/)) {
                            // fallback for underscores
                            i++;
                            const afterTarget = nextText.replace(/^_+/, '');
                            if (remainingMask) newContent.appendChild(document.createTextNode(remainingMask));
                            if (afterTarget) newContent.appendChild(document.createTextNode(afterTarget));
                        }
                    } else {
                        if (nextText.match(/^_+/)) {
                            i++;
                            const currentUnderscores = nextText.match(/^_+/)[0];
                            const afterUnderscores = nextText.replace(/^_+/, '');
                            const newUnderscoresLength = Math.max(0, currentUnderscores.length - (hintPart.length - oldHintLength));

                            if (newUnderscoresLength > 0) {
                                newContent.appendChild(document.createTextNode('_'.repeat(newUnderscoresLength)));
                            }
                            if (afterUnderscores) {
                                newContent.appendChild(document.createTextNode(afterUnderscores));
                            }
                        }
                    }
                }
                continue;
            }
        }

        // Preserve existing nodes
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN' && !node.classList.contains('hint-text')) {
            newContent.appendChild(node.cloneNode(true)); // Preserve previous answers!
        } else {
            newContent.appendChild(node.cloneNode(true));
        }
    }

    if (foundBlank) {
        container.textContent = '';
        container.appendChild(newContent);
        return true;
    }
    return false;
}
