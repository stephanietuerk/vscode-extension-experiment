# Use Cases

I want to be able to check the writing level of my text. If it is too high, I want to be able to simplify it. If it is too low, I want to be able to make it more complex. I want to know where my writing is off so that I can easily make changes.

Use case: writing documentation. Note that documentation could have code snippets in it or for masochists, could be _in_ html? Need to parse out prose from code, and can't reply on code blocks.

## Requirements

- A user needs to be able to set a target reading level. Options should be "human readable" -- i.e. easy to understand and schematic -- user does not need to dial in a specific grade level. (too high of cognitive load)

- I don't want to have to run the command over and over as I type. I'd like to be able to see the reading level at the end of each paragraph. I also don't want it to appear after every sentence because that is distracting as I write.

- At the same time, I want a way to parse a whole document in one go -- so that I don't have to keep the live scanning feature on while I write if I don't want.

- I want this to work on any sentences that are found on the page. For example, sometimes I write text into an HTML file. I think ideally this could work on that, and it could...eek...parse out the code?

- <strike>uhhhh, how are you going to detect the end of a paragraph in HTML? This seems challenging given that special chars may appear in prose.
- waaaaiiiiiiittttt, can I tap into the extra-syntax highlighting of like, TS language service to detect plain text/prose?</strike>

Nope let's just limit this to plain text and markdown files for now. :)

- After I write a paragraph, I want to see sentences that aren't at level. I want a visual indication of whether it is above or below. Then I want to be able to right click/interact and get suggested changes. I'm thinking a squiggly underline, akin to what I get from spellcheck. Need to be careful with colors because we need to colors that don't have value judgments attached to them. (i.e. no red green)

- I don't want to have to go to settings to change the reading level, because I may want to change it all the time for different docs that I work on. I want to be able to do it from some point and clicky interface. But this should be global for the file -- set it once and that is it. It should not appear in the same interface as the replacement suggestions.

- Probably need a way for reader to know WHAT prose was checked / is included in the overall reading level. (Assuming entire page is not prose. Otherwise they will be like, wait was this checked? Is my code included?)

## Interface ideas

- If I want a clickable interface to set the level, I want that to be visible at all times/needs to be visible before the writing starts. (Update -- probably use a quick pick)

- Maybe a side panel that shows the overall reading level, and then shows the first N sentences that are above or below the level with the option to replace? I should figure out if this replacement option is possible because I'm planning a lot of the ux around it. If not possible...I should rethink.

- OOOh but you know, if it's super obtrusive, people won't leave it on. What about making it less visible to encourage people to keep it on all the time?

## Rough code sketch

const sentences = getSentencesOnPage() {}
sentences.forEach(sentence => {
const level = getReadingLevel(sentence)
if (level > targetLevel + tolerance) {
show squiggly underline
} else if (level < targetLevel - tolerance) {
show squiggly underline
}
})

### How to build:

build on click experience first

parse text and hook up reading level thing, assume whole page is text, print out reading level for whole thing somewhere.

try to parse out paragraphs and sentences, get reading level on hover/right click?

try to underline text that is above or below level.

then convert to real time highlighting
