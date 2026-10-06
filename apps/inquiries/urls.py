from django.urls import path

from .views import ContactInquiryCreateView, InquiryDetailView, InquiryListView, VisitInquiryCreateView

urlpatterns = [
    path("inquiries/contact/", ContactInquiryCreateView.as_view(), name="inquiry-contact"),
    path("inquiries/visits/", VisitInquiryCreateView.as_view(), name="inquiry-visit"),
    path("inquiries/", InquiryListView.as_view(), name="inquiry-list"),
    path("inquiries/<str:inquiry_id>/", InquiryDetailView.as_view(), name="inquiry-detail"),
]
