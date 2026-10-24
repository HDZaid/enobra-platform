from django.urls import path

from .views import PermissionListView, RoleDetailView, RoleListCreateView
from .user_views import UserDetailView, UserListCreateView, UserRoleOptionsView, UserRoleView

urlpatterns = [
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/roles/', UserRoleOptionsView.as_view(), name='user-role-options'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/role/', UserRoleView.as_view(), name='user-role'),
    path("permissions/", PermissionListView.as_view(), name="permission-list"),
    path("roles/", RoleListCreateView.as_view(), name="role-list-create"),
    path("roles/<int:role_id>/", RoleDetailView.as_view(), name="role-detail"),
]
