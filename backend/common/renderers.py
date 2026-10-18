from djangorestframework_camel_case.render import CamelCaseJSONRenderer


class CamelJSONRenderer(CamelCaseJSONRenderer):
    """camelCase JSON that still renders a bare `null` for empty payloads.

    DRF's default renderer returns an empty body for None, which breaks the
    contract's `Question | null` / `User | null` responses.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b"null"
        return super().render(data, accepted_media_type, renderer_context)
