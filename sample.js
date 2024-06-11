// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



const openInNewTab = (url) => {
    var newURL = url;
    chrome.tabs.create({ url: newURL });
}

const generateFallbackUrl = async (query) => {
    const url = new URL("https://standard--template--construct-org.ipns.dweb.link/#/?q=" + encodeURIComponent(query) + "&p=1&ds=false")
    return url.toString()
}

const openPaper = async (query) => {
    console.log(query)
    const scihubUrl = await checkScihubs(query)
    if (scihubUrl) {
        openInNewTab(scihubUrl)
        return
    }
    const libgenUrl = await checkLibgens(query)
    if (libgenUrl) {
        openInNewTab(libgenUrl)
        return
    }
    throw "no paper found"
}

const openFallback = async (query) => {
    const fallbackUrl = await generateFallbackUrl(query)
    openInNewTab(fallbackUrl)
}

const checkLibgens = async (query) => {
    const libgenUrls = [
        'https://libgen.is/scimag/',
    ]

    let libgenPromises = [
        ...libgenUrls.map((libgenUrl) => checkLibgen(query, libgenUrl))
    ]
    let url = await Promise.any(libgenPromises).catch(e => undefined)

    console.log("done with libgen", url, libgenPromises)
    return url
}

const checkLibgen = async (query, ligbenUrl) => {
    console.log(`Checking on libgen ${query}`)
    const url = new URL(ligbenUrl)
    url.searchParams.append('q', query)
    console.log("libgen url:" + url.toString())

    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
        //'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
    })
    console.log("libgen response")
    console.log(response)
    if (response.status != 200) {
        console.log("libgen response not 200")
        throw "no"
    }
    const html = await response.text()
    const notFound = html.includes("o articles were found")
    if (notFound) {
        console.log("libgen no articles found")
        throw "no"
    }
    const exactlyOneResult = html.includes("1 files found")
    // TODO: direct link on exact match
    console.log("libgen found")
    return url.toString()
}

const checkScihubs = async (query) => {
    scihubUrls = [
        'https://sci-hub.se/',
        'https://sci-hub.ru/',
        // 'https://sci-hub.wf/',
        // 'https://sci-hub.tf/',
        // 'https://sci-hub.ee/',
    ]

    let scihubPromises = [
        ...scihubUrls.map((scihubUrl) => checkScihubDoi(query, scihubUrl)),
        ...scihubUrls.map((scihubUrl) => checkScihub(query, scihubUrl))
    ]


    let url = await Promise.any(scihubPromises).catch(e => undefined)
    return url
}

const checkScihubDoi = async (query, scihubUrl) => {
    if (query.length < 5) {
        throw "no"
        // Probably not a doi
    }
    const url = new URL(scihubUrl + query).toString()
    console.log(`Checking ${url}`)
    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
        //'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
    })
    console.log(response)
    if (response.status == 200 && !response.redirected && response.url == url) {
        const correctUrl = response.url
        return correctUrl
    }

    throw "no"

}

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



const findDoisFromJsonText = (html) => {
    let doiResults = html.matchAll(new RegExp('"doi"\\w*:\\w*"([^/"]+[/][^"]+)"', "gi"))
    doiResults = [...doiResults]
    const dois = doiResults.map(doiResult => doiResult[1])
    console.log("json dois:", dois)


    return dois
}

const findDoisFromTextUrls = (html) => {
    let doiResults = html.matchAll(new RegExp("doi\\.org/([A-Za-z0-9-_.~!*'();:@&=+$,/?%#[\\]]+)", "gi"))
    doiResults = [...doiResults]
    const dois = doiResults.map(doiResult => doiResult[1])
    console.log("url dois:", dois)


    return dois
}


const getDoisAndQueriesFromHtml = async (html) => {
    const promise = new Promise((resolve, reject) => {
        const timeo = setTimeout(() => {
            reject("timeout")
        }, 10000)
        const onDone = (result) => {
            console.log("Received from offscreen", result)
            chrome.runtime.onMessage.removeListener(onDone);
            resolve(result);
            clearTimeout(timeo)
        };
        chrome.runtime.onMessage.addListener(onDone);
        chrome.runtime.sendMessage({ html: html });
    })

    const result = await promise;
    console.log("Offscreen parser returned", result)
    const { dois, queries } = result
    return { dois, queries }
}

const findDoiAndQueryFromLink = async (link) => {
    if (link.length < 5) {
        throw "link probably too short"
        // Probably not a doi
    }
    const url = new URL(link).toString()
    console.log(`Trying to find doi on ${url}`)
    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
    })
    console.log(response)
    if (response.status != 200) {
        throw "no 200 result"
    }

    const html = await response.text()
    const { dois, queries } = await getDoisAndQueriesFromHtml(html)
    const doiAndQuery = { doi: findMostCommonElement(dois ?? []), query: findMostCommonElement(queries ?? []) }
    console.log("doi and query", doiAndQuery)
    return doiAndQuery
}

const findDoiFromLink = async (link) => {
    if (link.length < 5) {
        throw "link probably too short"
        // Probably not a doi
    }
    const url = new URL(link).toString()
    console.log(`Trying to find doi on ${url}`)
    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
    })
    console.log(response)
    if (response.status != 200) {
        throw "no 200 result"
    }

    const html = await response.text()
    // const parser = new DOMParser();
    // const htmlDoc = parser.parseFromString(html, "text/html");

    const jsonDois = findDoisFromJsonText(html);
    const textUrlDois = findDoisFromTextUrls(html);
    // const aTagDois = findDoisFromATags(htmlDoc);
    const aTagDois = []
    const dois = [...jsonDois, ...textUrlDois, ...aTagDois]
    console.log("all dois:", dois)

    const uniqueDois = unique(dois)

    if (uniqueDois.length == 0) {
        console.error("Found more no doi in link")
        throw "no doi"
    }

    if (uniqueDois.length == 1) {
        console.log("Found exactly one doi in link")
        return uniqueDois[0]
    }

    console.error("Found more than one doi")
    const commonDoi = findMostCommonElement([jsonDois[0], textUrlDois[0], aTagDois[0], ...jsonDois, ...textUrlDois, ...aTagDois].filter(e => e))

    console.log("Most common doi is", commonDoi)
    return commonDoi
}

const getDirectPdfUrl = async (link) => {
    if (link.length < 5) {
        return undefined
        // Probably not a pdf
    }
    if (!link.endsWith("pdf")) {
        return undefined
        // Probably not a pdf
    }
    const url = new URL(link).toString()
    console.log(`Trying to find doi on ${url}`)
    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
    })
    console.log(response)
    if (response.status != 200) {
        return undefined
    }

    if (response.headers.get("content-type") == "application/pdf") {
        return response.url
    }

    return undefined
}

const checkScihub = async (query, scihubUrl) => {
    data = new URLSearchParams()
    const request = new FormData()
    request.append('request', query)

    const url = new URL(scihubUrl).toString()
    console.log(`Checking ${url}`)
    const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        body: request,
        mode: 'no-cors', // no-cors, *cors, same-origin)headers: {
        //'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
    })
    console.log(response)
    const normalizedResponseUrl = new URL(response.url).toString()
    if (response.status == 200 && url != normalizedResponseUrl && (normalizedResponseUrl.length - 6 > url.length)) {
        const correctUrl = response.url
        return correctUrl
    }

    throw "no"

}

chrome.runtime.onInstalled.addListener(function () {
    // Create one test item for each context type.
    let contexts = [
        'page',
        'selection',
        'link',
        // 'editable',
        // 'image',
        // 'video',
        // 'audio'
    ];
    chrome.contextMenus.create({
        title: "Yarr!",
        contexts: contexts,
        id: "piratethispaper"
    });

    chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'reason for needing the document',
    });

});




const handler = async (event) => {
    const query = event.selectionText;
    let link = event.linkUrl;
    let fallback = undefined;
    if (query) {
        fallbackUrl = await generateFallbackUrl(query)
        try {
            await openPaper(query)
            return
        } catch (e) {

        }

    }
    if (link) {
        const directPdfUrlPromise = getDirectPdfUrl(link)
        {
            const doi = getDoiFromDoiOrgUrl(link)

            if (doi) {
                fallbackUrl = await generateFallbackUrl(doi)

                try {
                    await openPaper(doi)
                    return
                } catch (e) { }
            }
        }

        const directPdfUrl = await directPdfUrlPromise
        if (directPdfUrl) {
            openInNewTab(directPdfUrl)
            return
        }

        try {
            const doiFromLink = await findDoiFromLink(link)
            if (doiFromLink) {
                fallbackUrl = await generateFallbackUrl(doiFromLink)

                await openPaper(doiFromLink)
                return
            }
        } catch (e) {
            console.error("Failed to get doi from link", e)
        }
        try {
            const { doi, query } = await findDoiAndQueryFromLink(link)
            console.log("doi and query", doi, query)
            if (doi) {
                fallbackUrl = await generateFallbackUrl(doi)

                try {
                    await openPaper(doi)
                    return
                } catch (e) { }
            }
            if (query) {
                fallbackUrl = await generateFallbackUrl(query)

                try {
                    await openPaper(query)
                    return
                } catch (e) { }
            }
        } catch (e) { }
    }
    if (!link && event.pageUrl) {
        const link = event.pageUrl
        const directPdfUrlPromise = getDirectPdfUrl(link)
        {
            const doi = getDoiFromDoiOrgUrl(link)

            if (doi) {
                fallbackUrl = await generateFallbackUrl(doi)

                try {
                    await openPaper(doi)
                    return
                } catch (e) { }
            }
        }

        const directPdfUrl = await directPdfUrlPromise
        if (directPdfUrl) {
            openInNewTab(directPdfUrl)
            return
        }

        try {
            const doiFromLink = await findDoiFromLink(link)
            if (doiFromLink) {
                fallbackUrl = await generateFallbackUrl(doiFromLink)

                await openPaper(doiFromLink)
                return
            }
        } catch (e) {
            console.error("Failed to get doi from link", e)
        }
        try {
            const { doi, query } = await findDoiAndQueryFromLink(link)
            console.log("doi and query", doi, query)
            if (doi) {
                fallbackUrl = await generateFallbackUrl(doi)

                try {
                    await openPaper(doi)
                    return
                } catch (e) { }
            }
            if (query) {
                fallbackUrl = await generateFallbackUrl(query)

                try {
                    await openPaper(query)
                    return
                } catch (e) { }
            }
        } catch (e) { }
    }

    if (fallbackUrl) {
        openInNewTab(fallbackUrl)
    }
    console.error("no query or doi link")
}

chrome.contextMenus.onClicked.addListener(handler)
