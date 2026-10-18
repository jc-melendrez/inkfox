from djangorestframework_camel_case.render import CamelCaseJSONRenderer


class CamelJSONRenderer(CamelCaseJSONRenderer):
    """camelCase JSON that still renders a bare `null` for empty 200 payloads.

    DRF's default renderer returns an empty body for None, which breaks the
    contract's `Question | null` / `User | null` responses. HTTP 204 means "no
    content" and must stay body-less, so `null` is never written there.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get("response")
        if response is not None and response.status_code == 204:
            return b""
        if data is None:
            return b"null"
        return super().render(data, accepted_media_type, renderer_context)
