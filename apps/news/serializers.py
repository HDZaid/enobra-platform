from rest_framework import serializers

from apps.common.enums import NewsCategory
from apps.common.fields import MediaReferenceField
from apps.common.serializers import AuditFieldsMixin


class NewsSerializer(AuditFieldsMixin):
    id = serializers.SlugField(read_only=True)
    title = serializers.CharField()
    category = serializers.ChoiceField(choices=NewsCategory.choices)
    date = serializers.DateField()
    description = serializers.CharField()
    image = serializers.CharField()
    demo = serializers.BooleanField()
    published = serializers.BooleanField()


class NewsWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160)
    category = serializers.ChoiceField(choices=NewsCategory.choices)
    date = serializers.DateField()
    description = serializers.CharField()
    image = MediaReferenceField()
    demo = serializers.BooleanField(default=True)
    published = serializers.BooleanField(default=True)


class NewsListQuerySerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=NewsCategory.choices, required=False)
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)
