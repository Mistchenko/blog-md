from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ArticleNode(BaseModel):
    type: Literal["article"] = "article"
    name: str
    path: str
    title: str
    updated_at: datetime


class DirNode(BaseModel):
    type: Literal["dir"] = "dir"
    name: str
    path: str
    children: list[TreeNode] = []


type TreeNode = Annotated[DirNode | ArticleNode, Field(discriminator="type")]


class Article(BaseModel):
    path: str
    title: str
    content: str
    updated_at: datetime
