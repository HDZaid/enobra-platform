from rest_framework import serializers


class ServiceSerializer(serializers.Serializer):
    id = serializers.SlugField(help_text="Slug estable: diseno, administracion, preconstruccion, construccion.")
    title = serializers.CharField()
    image = serializers.CharField(help_text="URL de la imagen de portada.")
    short = serializers.CharField(help_text="Resumen de una línea (tarjetas del Inicio).")
    description = serializers.CharField()
    items = serializers.ListField(child=serializers.CharField(), help_text="Alcances del servicio.")
    subject = serializers.CharField(help_text="Valor de 'asunto' que se preselecciona en el formulario de contacto.")
