const getDoiFromDoiOrgUrl = (link) => {
    const url = new URL(link)
    const host = url.host
    if (host == "doi.org") {
        const doi = url.pathname.slice(1)
        if (doi.length > 5) {
            return doi
        }
    }
    return undefined
}

const unique = (array) => {
    return array.filter((element, index) => array.findIndex(e => e == element) == index)
}



const findMostCommonElement = (array) => {
    // Duplicate the first element to make it more likely to be selected
    const data = [array[0], ...array]

    const mostCommonData = [...data].sort((a, b) =>
        data.filter(v => v === a).length
        - data.filter(v => v === b).length
    ).pop();

    return mostCommonData
}

const findCorrectTitle = (element) => {
    let title = element.querySelectorAll('meta[name="citation_title"]')?.[0]?.content
    if (title) {
        return title
    }
    title = element.querySelectorAll('meta[name="dc.Title"]')?.[0]?.content
    if (title) return title
    title = element.querySelectorAll('meta[name="DC.Title"]')?.[0]?.content
    if (title) return title
    title = element.querySelectorAll('meta[name="DC.title"]')?.[0]?.content
    if (title) return title
    return undefined
}

const findCorrectDoi = (element) => {
    let doi = element.querySelectorAll('meta[name="citation_doi"]')?.[0]?.content
    if (doi) return doi
    doi = element.querySelectorAll('meta[name="dc.identifier"]')?.[0]?.content
    if (doi) return doi
    doi = element.querySelectorAll('meta[name="DC.Identifier"]')?.[0]?.content
    if (doi) return doi
    doi = element.querySelectorAll('meta[name="DC.identifier"]')?.[0]?.content
    if (doi) return doi
    return undefined
}

const findPossibleQueryStrings = (element) => {
    const ogTitle = element.querySelectorAll('meta[property="og:title"]')?.[0]?.content
    const twitterTitle = element.querySelectorAll('meta[property="twitter:title"]')?.[0]?.content
    const titleTitle = element.querySelector("title")?.textContent
    const possibleStrings = unique([ogTitle, twitterTitle, titleTitle])
    return possibleStrings.filter(e => e)
}

const findDoisFromATags = (htmlDoc) => {
    const doiHrefs = htmlDoc.querySelectorAll('a')
    if (doiHrefs.length == 0) {
        return []
    }
    console.log("a elements ", doiHrefs)
    let dois = [...doiHrefs].flatMap((href) => {

        const doi = getDoiFromDoiOrgUrl(href.href)
        if (doi) {
            return [doi]
        }
        return []
    })
        .filter((doi) => doi != undefined)
        .filter((doi) => doi.length > 5)
        .filter((doi) => doi.includes("/"))
    console.log("a tag dois:", dois)

    if (dois.length == 0) {
        return []
    }



    return dois.filter(e => e);
}

const findTitles = async (element) => {
    const correctTitle = findCorrectTitle(element)
    if (correctTitle) return [correctTitle]
    const titles = findPossibleQueryStrings(element)
    return titles
}

const findDois = async (element) => {
    const correctDoi = findCorrectDoi(element)
    if (correctDoi) return [correctDoi]
    const doisFromATags = findDoisFromATags(element)
    return doisFromATags
}

async function parseDoisAndTitles(html) {
    const htmlDoc = new DOMParser().parseFromString(html, 'text/html');

    const dois = await findDois(htmlDoc)
    const queries = await findTitles(htmlDoc)
    chrome.runtime.sendMessage({ dois, queries });
}

chrome.runtime.onMessage.addListener(async (msg) => {
    console.log("Got offscreen message", msg);
    const { html } = msg;
    parseDoisAndTitles(html);
});