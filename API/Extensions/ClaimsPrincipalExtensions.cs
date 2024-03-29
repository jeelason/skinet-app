using System.Security.Claims;

namespace API.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static string RetrieveEmailFromPrincipal(this ClaimsPrincipal user)
        {
            //can be simplified with 
            // return user.FindFirstValue(ClaimTypes.Email);
            return user?.Claims?.FirstOrDefault(x => x.Type == ClaimTypes.Email).Value;
        }
    }
}