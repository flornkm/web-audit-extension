import { Action, ActionPanel, Detail, Form, Icon } from "@raycast/api";
import { useState } from "react";
import ogs from "open-graph-scraper";
import fetch from "node-fetch";

export default function Command() {
  const [result, setResult] = useState(null as unknown as Record<string, string>);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();
  const [score, setScore] = useState<number>(0);
  const [missing, setMissing] = useState<string[]>([]);
  const notFound = [] as string[];

  const metaData = async (siteUrl: string) => {
    const options = { url: siteUrl };
    const { result } = await ogs(options);
    seoScore(result as Record<string, string>);
    setResult(result as Record<string, string>);
  };

  const seoScore = (result: Record<string, string>) => {
    const { ogTitle, ogDescription, ogImage, ogUrl } = result;
    let score = 0 as number;

    if (ogTitle) score += 1;
    else notFound.push("Set an Open Graph Title");
    if (ogDescription) score += 1;
    else notFound.push("Set an Open Graph Description");
    if (ogImage) score += 1;
    else notFound.push("Set an Open Graph Image");

    // Calculate the percentage of the score when 100 is the max
    score = Math.round((score / 3) * 100);

    console.log(notFound);
    setMissing(notFound);
    setScore(score);
  };

  const urlReachable = async (url: string) => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      return false;
    }
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
    ); // fragment locator
    return !!pattern.test(url);
  };

  const dropUrlErrorIfNeeded = () => {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  };

  const submitForm = async (values: Record<string, string>) => {
    if (values.url) {
      if (validateUrl(values.url) && (await urlReachable(values.url))) {
        await metaData(String(values.url));
        setWebsite(String(values.url));
      } else {
        setUrlError("Invalid URL");
      }
    } else {
      setUrlError("URL is required");
    }
  };

  return (
    <>
      {!result && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm
                onSubmit={(values) => {
                  submitForm(values);
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
      {result && (
        <Detail
          navigationTitle={`Analyzed ${website}`}
          markdown={
            ((result.ogImage &&
              !Array.isArray(result.ogImage) &&
              `# SEO Score: ${score * 25}% \n ![${result.ogTitle}](${result.ogImage.url})`) ||
              `# SEO Score: ${score * 25}%`) +
            ((missing.length !== 0 && `\n \n You can adjust the following:`) || "") +
            missing.map((item) => `\n - ${item}`).join("")
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
