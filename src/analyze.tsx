import { Action, ActionPanel, Detail, Form } from "@raycast/api";
import { useState } from "react";
import ogs from "open-graph-scraper";
import fetch from "node-fetch";

export default function Command() {
  const [result, setResult] = useState(null as unknown as Record<string, string>);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();

  const metaData = async (siteUrl: string) => {
    const options = { url: siteUrl };
    const { result } = await ogs(options);
    setResult(result as Record<string, string>);
    console.log(result);
  };

  const seoScore = (result: Record<string, string>) => {
    const { ogTitle, ogDescription, ogImage, ogUrl } = result;
    let score = 0 as number;
    if (ogTitle) score += 1;
    if (ogDescription) score += 1;
    if (ogImage) score += 1;
    if (ogUrl) score += 1;
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

  const validateUrl = (url: string) => {
    const pattern = new RegExp(
      "^(https?:\\/\\/)" ||
        "" + // protocol
          "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
          "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
          "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
          "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
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
    if (validateUrl(values.url) && (await urlReachable(values.url))) {
      await metaData(String(values.url));
      setWebsite(String(values.url));
    } else {
      setUrlError("Invalid URL");
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
            (result.ogImage &&
              `# SEO Score: ${seoScore(result) * 25}% \n ![${result.ogTitle}](${result.ogImage.url})`) ||
            `# SEO Score: ${seoScore(result) * 25}%`
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
                  icon={{ source: "command-icon.png" }}
                />
              </ActionPanel>
            )
          }
        />
      )}
    </>
  );
}
