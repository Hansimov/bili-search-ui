export const replaceHtmlTags = {
    type: 'output',
    filter: (html: string) =>
        html
            .replace(/<p>/g, '<div>')
            .replace(/<\/p>/g, '</div>')
            .replace(/<br\s*\/?>/g, '<brx></brx>'),
};