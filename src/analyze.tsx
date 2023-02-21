import { Action, ActionPanel, Detail, Form, Icon } from "@raycast/api";
import { useState } from "react";
import ogs from "open-graph-scraper";
import fetch from "node-fetch";

export default function Command() {
  const [result, setResult] = useState(null as unknown as Record<string, string>);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();
  const [score, setScore] = useState<number>(0);
  const [imgTags, setImgTags] = useState<string>();
  const [hTags, setHTags] = useState<string>();
  const [missing, setMissing] = useState<string[]>([]);
  const [pageSpeed, setPageSpeed] = useState<string>();
  const [metaViewPortTag, setMetaViewPortTag] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const metaData = async (siteUrl: string) => {
    const options = { url: siteUrl };
    const { result } = await ogs(options);
    const score = await seoScore(result as Record<string, string>);
    await fetchPageTags(siteUrl as string, score);
    setResult(result as Record<string, string>);
  };

  const seoScore = async (result: Record<string, string>) => {
    const { ogTitle, ogDescription, ogImage } = result;
    let score = 0 as number;
    const notFound = [];

    if (ogTitle) score += 1;
    else notFound.push("Set an Open Graph Title");
    if (ogDescription) score += 1;
    else notFound.push("Set an Open Graph Description");
    if (ogImage) score += 1;
    else notFound.push("Set an Open Graph Image");

    setMissing(notFound);
    setScore(score);

    return score;
  };

  const urlReachable = async (url: string) => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const timeUntilResponse = async (url: string, score: number) => {
    const start = Date.now();
    await fetch(url);
    const end = Date.now();
    if (end - start > 1000) {
      return end - start + " ms";
    } else {
      setScore(score + 1);
      return end - start + " ms";
    }
  };

  const fetchPageTags = async (url: string, score: number) => {
    const response = await fetch(url);
    const html = await response.text();
    const altRegex = /<img[^>]+alt="([^">]+)"[^>]*>/g;
    const altMatches = html.matchAll(altRegex);
    const altTags = Array.from(altMatches, (m) => m[1]);
    const imgRegex = /<img[^>]+>/g;
    const imgMatches = html.matchAll(imgRegex);
    const imgTags = Array.from(imgMatches, (m) => m[0]);

    if (altTags.length < imgTags.length) {
      setImgTags(` ${String(imgTags.length - altTags.length)} images are missing alt tags`);
      setScore(score);
    } else {
      setImgTags(`All images have alt tags, well done! 👏`);
      setScore(score + 1);
    }

    const h1Regex = /<h1[^>]+>([^">]+)<\/h1>/g;
    const h1Matches = html.matchAll(h1Regex);
    const h1Tags = Array.from(h1Matches, (m) => m[1]) as string[];
    const h2Regex = /<h2[^>]+>([^">]+)<\/h2>/g;
    const h2Matches = html.matchAll(h2Regex);
    const h2Tags = Array.from(h2Matches, (m) => m[1]) as string[];
    const h3Regex = /<h3[^>]+>([^">]+)<\/h3>/g;
    const h3Matches = html.matchAll(h3Regex);
    const h3Tags = Array.from(h3Matches, (m) => m[1]) as string[];

    if (h1Tags.length < h2Tags.length && h2Tags.length < h3Tags.length) {
      setHTags(`All headings are in order, well done! 👏`);
      setScore(score + 1);
    } else {
      setHTags(`Headings are not in order`);
    }

    const metaViewportRegex = /<meta[^>]+name="viewport"[^>]+>/g;
    const metaViewportMatches = html.matchAll(metaViewportRegex);
    const metaViewportTags = Array.from(metaViewportMatches, (m) => m[0]) as string[];
    if (metaViewportTags.length > 0) {
      setMetaViewPortTag(true);
      setScore(score + 1);
    } else {
      setMetaViewPortTag(false);
    }

    const pageSpeed = await timeUntilResponse(url, score);
    setPageSpeed(pageSpeed);
  };

  const validateUrl = (url: string) => {
    const pattern = new RegExp(
      "^(https?:\\/\\/)" ||
        "" +
          "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
          "((\\d{1,3}\\.){3}\\d{1,3}))" +
          "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
          "(\\?[;&a-z\\d%_.~+=-]*)?" +
          "(\\#[-a-z\\d_]*)?$",
      "i"
    );
    return !!pattern.test(url);
  };

  const dropUrlErrorIfNeeded = () => {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  };

  const submitForm = async (values: Record<string, string>) => {
    setLoading(true);
    if (values.url) {
      if (validateUrl(values.url) && (await urlReachable(values.url))) {
        await metaData(String(values.url));
        setWebsite(String(values.url));
        setLoading(false);
      } else {
        setUrlError("Invalid URL");
        setLoading(false);
      }
    } else {
      setUrlError("URL is required");
      setLoading(false);
    }
  };

  return (
    <>
      {!result && !loading && (
        <Form
          navigationTitle={loading ? "Analyzing..." : "SEO Analyzer"}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                onSubmit={(values) => {
                  if (!loading) submitForm(values);
                  else return;
                }}
                title="Analyze"
              />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="url"
            title="URL (with https)"
            placeholder="https://www.example.com"
            error={urlError}
            onChange={() => dropUrlErrorIfNeeded()}
          />
        </Form>
      )}
      {result && !loading && (
        <Detail
          navigationTitle={`Analyzed ${website}`}
          markdown={
            ((result.ogImage &&
              !Array.isArray(result.ogImage) &&
              `# SEO Score: ${score} / 7 \n ![${result.ogTitle}](${result.ogImage.url})`) ||
              `# SEO Score: ${score} / 7`) +
            ((`\n \n ## The analysis returned the following:`) || "") +
            missing.map((item) => `\n - ${item}`).join("") +
            ((imgTags && `\n - ${imgTags}`) || "") +
            ((hTags && `\n - ${hTags}`) || "") +
            ((pageSpeed && `\n - Page loaded in: ${pageSpeed}`) || "") +
            ((metaViewPortTag && `\n - Meta viewport tag found`) || "\n - No meta viewport tag found")
          }
          metadata={
            <Detail.Metadata>
              {result.author && <Detail.Metadata.Label title="Sitename" text={result.author} />}
              {result.ogTitle && <Detail.Metadata.Label title="Homepage Title" text={result.ogTitle} />}
              {result.ogDescription && <Detail.Metadata.Label title="Site Description" text={result.ogDescription} />}
              {result.twitterSite && <Detail.Metadata.Label title="Twitter" text={result.twitterSite} />}
              {result.charset && (
                <Detail.Metadata.TagList title="Charset">
                  <Detail.Metadata.TagList.Item text={result.charset} color="#ff0000"></Detail.Metadata.TagList.Item>
                </Detail.Metadata.TagList>
              )}
              {result.ogLocale && (
                <Detail.Metadata.TagList title="Locale">
                  <Detail.Metadata.TagList.Item text={result.ogLocale} color="#0000ff"></Detail.Metadata.TagList.Item>
                </Detail.Metadata.TagList>
              )}
              <Detail.Metadata.Separator />
              {result.author && result.ogUrl && (
                <Detail.Metadata.Link title="Source" target={result.ogUrl} text={result.author} />
              )}
            </Detail.Metadata>
          }
          actions={
            website && (
              <ActionPanel>
                <Action.OpenInBrowser url={website} title="Open Site" />
                <Action
                  title="Analyze another site"
                  onAction={() => {
                    setResult(null as unknown as Record<string, string>);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  icon={Icon.ArrowLeft}
                />
              </ActionPanel>
            )
          }
        />
      )}
    </>
  );
}
