from rest_framework import serializers


class SearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=80)
    limit = serializers.IntegerField(min_value=1, max_value=20, default=5, required=False,
                                     help_text="Máximo de resultados por grupo.")


class SearchHitSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True, required=False)


class SearchResponseSerializer(serializers.Serializer):
    query = serializers.CharField()
    total = serializers.IntegerField()
    services = SearchHitSerializer(many=True)
    projects = SearchHitSerializer(many=True)
    properties = SearchHitSerializer(many=True)
    news = SearchHitSerializer(many=True)
